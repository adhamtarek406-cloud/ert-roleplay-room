// Transport-agnostic room logic, shared by the Node hub (server/rooms.js) and the Cloudflare
// Durable Object (worker/index.js). The server is authoritative: clients send intents, this
// module validates them and mutates the room; the transport then pushes fresh snapshots.
import { DEFAULT_SETTINGS, computeRound, validAnswers } from '../shared/scorecard.js';

const MAX_NAME = 60;
export const token = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
export const newCode = () => 'ERT-' + (1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
const clean = (s, max = MAX_NAME) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

export function newRoom(code, { name, trainerName, settings } = {}) {
  return {
    code,
    hostKey: token(),
    name: clean(name, 90) || 'Untitled room',
    trainerName: clean(trainerName) || 'Trainer',
    settings: {
      partialCredit: !!settings?.partialCredit,
      zeroOnAutoFail: settings?.zeroOnAutoFail ?? DEFAULT_SETTINGS.zeroOnAutoFail,
      showRunningScore: settings?.showRunningScore ?? DEFAULT_SETTINGS.showRunningScore,
    },
    stage: 'room', // room | final
    trainees: [], // { id, name, status: invited|joined, c, token }
    round: null, // { n, performerId, start, status: live|review, scorerIds, subs: { id: answers }, result }
    rounds: [], // finished rounds: { n, performerId, result }
    colorSeq: 0,
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
}

// hello → the connection's context, or a rejection. ctx = { role, traineeId, removed }
export function authenticate(room, msg) {
  if (msg.role === 'host') return msg.hostKey === room.hostKey ? { role: 'host', traineeId: null } : 'not-host';
  const t = msg.id && msg.token && room.trainees.find(x => x.id === msg.id && x.token === msg.token);
  return { role: 'trainee', traineeId: t ? t.id : null };
}

// What one connection is allowed to see. Individual answers never leave the server;
// a trainee only gets their own submission back.
export function snapshot(room, ctx, onlineIds) {
  const r = room.round;
  return {
    type: 'state', now: Date.now(),
    you: { role: ctx.role, id: ctx.traineeId || null, removed: !!ctx.removed },
    room: {
      code: room.code,
      name: room.name,
      trainerName: room.trainerName,
      settings: room.settings,
      stage: room.stage,
      trainees: room.trainees.map(t => ({ id: t.id, name: t.name, status: t.status, c: t.c, online: onlineIds.has(t.id) })),
      round: r && {
        n: r.n, performerId: r.performerId, start: r.start, status: r.status,
        scorerIds: r.scorerIds, submitted: Object.keys(r.subs),
        result: r.status === 'review' ? r.result : null,
      },
      rounds: room.rounds,
      mySubmission: ctx.traineeId && r ? r.subs[ctx.traineeId] || null : null,
    },
  };
}

const addTrainee = (room, name, status) => {
  const t = { id: 't' + token().slice(0, 10), name, status, c: room.colorSeq++ % 7, token: null };
  room.trainees.push(t);
  return t;
};

const hostActions = {
  addTrainee(room, { name }) {
    name = clean(name);
    if (!name) return { error: 'Enter a name' };
    if (room.trainees.some(t => sameName(t.name, name))) return { error: `${name} is already on the list` };
    addTrainee(room, name, 'invited');
    return { toast: name.split(' ')[0] + ' invited' };
  },
  removeTrainee(room, { id }) {
    const t = room.trainees.find(x => x.id === id);
    if (!t) return { error: 'Trainee not found' };
    const r = room.round;
    if (r && r.status === 'live' && r.performerId === id) return { error: "Can't remove the trainee on the call" };
    room.trainees = room.trainees.filter(x => x.id !== id);
    if (r && r.status === 'live') {
      r.scorerIds = r.scorerIds.filter(x => x !== id);
      delete r.subs[id];
    }
    return { toast: t.name.split(' ')[0] + ' removed', removedId: id };
  },
  startRound(room, { performerId }) {
    if (room.stage !== 'room') return { error: 'The session has ended' };
    if (room.round) return { error: 'A round is already running' };
    const joined = room.trainees.filter(t => t.status === 'joined');
    if (!joined.some(t => t.id === performerId)) return { error: 'That trainee is not in the room' };
    if (joined.length < 2) return { error: 'You need at least 2 trainees in the room' };
    room.round = {
      n: room.rounds.length + 1, performerId, start: Date.now(), status: 'live',
      scorerIds: joined.filter(t => t.id !== performerId).map(t => t.id), subs: {}, result: null,
    };
    return { event: 'round-started' };
  },
  cancelRound(room) {
    if (!room.round || room.round.status !== 'live') return { error: 'No live round' };
    room.round = null;
    return { toast: 'Round cancelled', event: 'round-cancelled' };
  },
  endRound(room) {
    const r = room.round;
    if (!r || r.status !== 'live') return { error: 'No live round' };
    if (!Object.keys(r.subs).length) return { error: 'Wait for at least one scorecard' };
    r.status = 'review';
    r.result = computeRound(r.subs, room.settings);
    room.rounds.push({ n: r.n, performerId: r.performerId, result: r.result });
    return { event: 'round-revealed' };
  },
  nextRound(room) {
    if (room.round && room.round.status === 'live') return { error: 'A round is still live' };
    room.round = null;
    return {};
  },
  finish(room) {
    if (room.round && room.round.status === 'live') room.round = null;
    room.stage = 'final';
    return { event: 'session-ended' };
  },
  backToRoom(room) {
    room.stage = 'room';
    return {};
  },
  newSession(room) {
    room.stage = 'room';
    room.round = null;
    room.rounds = [];
    return { toast: 'New session started — same room, fresh scores' };
  },
};

const traineeActions = {
  submit(room, { answers }, ctx) {
    const r = room.round;
    if (!r || r.status !== 'live') return { error: 'This round is no longer live' };
    if (!r.scorerIds.includes(ctx.traineeId)) return { error: "You're not scoring this round" };
    if (r.subs[ctx.traineeId]) return { error: 'Scorecard already submitted' };
    if (!validAnswers(answers, room.settings)) return { error: 'Answer every attribute before submitting' };
    r.subs[ctx.traineeId] = Object.fromEntries(Object.entries(answers).filter(([k]) => /^a\d+$/.test(k)));
    return {};
  },
};

// Join by name. Claims an invited slot with that name, or a joined slot whose owner is offline
// (same person reopening the link); otherwise adds a new trainee.
function join(room, { name }, ctx, onlineIds) {
  if (ctx.role !== 'trainee') return { error: 'The trainer console cannot join as a trainee' };
  name = clean(name);
  if (!name) return { error: 'Enter your name to join' };
  let t = room.trainees.find(x => sameName(x.name, name));
  if (t && t.status === 'joined' && onlineIds.has(t.id)) return { error: `${t.name} is already in the room on another device` };
  if (!t) t = addTrainee(room, name, 'invited');
  t.status = 'joined';
  t.token = token();
  ctx.traineeId = t.id;
  ctx.removed = false;
  return { identity: { type: 'identity', code: room.code, id: t.id, token: t.token }, event: 'joined', eventName: t.name };
}

// Applies one client intent. Mutates room/ctx and returns
// { error } | { toast?, event?, eventName?, identity?, removedId? }.
export function handle(room, ctx, msg, onlineIds) {
  if (msg.type === 'join') return join(room, msg, ctx, onlineIds);
  const handler = ctx.role === 'host' ? hostActions[msg.type] : traineeActions[msg.type];
  if (!handler || !Object.hasOwn(ctx.role === 'host' ? hostActions : traineeActions, msg.type)) return { error: 'Not allowed' };
  if (ctx.role === 'trainee' && !ctx.traineeId) return { error: 'Join the room first' };
  return handler(room, msg, ctx);
}
