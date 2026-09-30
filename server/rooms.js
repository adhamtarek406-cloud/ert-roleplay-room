// Room state + realtime hub. The server is authoritative: clients send intents, the server
// validates them, mutates the room and pushes a tailored snapshot to every connected socket.
import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { WebSocketServer } from 'ws';
import { DEFAULT_SETTINGS, computeRound, validAnswers } from '../shared/scorecard.js';

const MAX_NAME = 60;
const token = () => randomBytes(16).toString('hex');
const clean = (s, max = MAX_NAME) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

export function createHub({ dataFile } = {}) {
  const rooms = new Map(); // code -> room
  const sockets = new Map(); // code -> Set<ws>

  // ---------- persistence ----------
  if (dataFile) {
    try {
      for (const r of JSON.parse(readFileSync(dataFile, 'utf8'))) rooms.set(r.code, r);
    } catch { /* first run */ }
  }
  let saveTimer = null;
  function persist() {
    if (!dataFile || saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      mkdirSync(dirname(dataFile), { recursive: true });
      writeFileSync(dataFile + '.tmp', JSON.stringify([...rooms.values()]));
      renameSync(dataFile + '.tmp', dataFile);
    }, 300);
  }

  // ---------- room lifecycle ----------
  function newCode() {
    let code;
    do code = 'ERT-' + randomInt(1000, 10000); while (rooms.has(code));
    return code;
  }

  // Public deployment guard: forget rooms nobody has touched in a day, and cap the total.
  const ROOM_TTL = 24 * 60 * 60 * 1000;
  const MAX_ROOMS = 500;
  function sweep() {
    const cutoff = Date.now() - ROOM_TTL;
    for (const [code, room] of rooms) {
      if ((room.lastActive || room.createdAt) < cutoff && !sockets.get(code)?.size) rooms.delete(code);
    }
  }

  function createRoom({ name, trainerName, settings }) {
    sweep();
    if (rooms.size >= MAX_ROOMS) return null;
    const code = newCode();
    const room = {
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
    };
    rooms.set(code, room);
    persist();
    return { code, hostKey: room.hostKey };
  }

  const online = (room, id) => [...(sockets.get(room.code) || [])].some(ws => ws.ctx.traineeId === id);

  // What a given socket is allowed to see. Individual answers never leave the server;
  // a trainee only gets their own submission back.
  function view(room, ctx) {
    const r = room.round;
    return {
      code: room.code,
      name: room.name,
      trainerName: room.trainerName,
      settings: room.settings,
      stage: room.stage,
      trainees: room.trainees.map(t => ({ id: t.id, name: t.name, status: t.status, c: t.c, online: online(room, t.id) })),
      round: r && {
        n: r.n, performerId: r.performerId, start: r.start, status: r.status,
        scorerIds: r.scorerIds, submitted: Object.keys(r.subs),
        result: r.status === 'review' ? r.result : null,
      },
      rounds: room.rounds,
      mySubmission: ctx.traineeId && r ? r.subs[ctx.traineeId] || null : null,
    };
  }

  function broadcast(room, event) {
    room.lastActive = Date.now();
    persist();
    for (const ws of sockets.get(room.code) || []) send(ws, room, event);
  }
  function send(ws, room, event) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({
      type: 'state', now: Date.now(), event: event || null,
      you: { role: ws.ctx.role, id: ws.ctx.traineeId || null, removed: !!ws.ctx.removed },
      room: view(room, ws.ctx),
    }));
  }
  const fail = (ws, message) => ws.readyState === ws.OPEN && ws.send(JSON.stringify({ type: 'error', message }));

  // ---------- intents ----------
  const hostActions = {
    addTrainee(room, { name }) {
      name = clean(name);
      if (!name) return 'Enter a name';
      if (room.trainees.some(t => sameName(t.name, name))) return `${name} is already on the list`;
      room.trainees.push({ id: 't' + token().slice(0, 10), name, status: 'invited', c: room.colorSeq++ % 7, token: null });
      return { toast: name.split(' ')[0] + ' invited' };
    },
    removeTrainee(room, { id }) {
      const t = room.trainees.find(x => x.id === id);
      if (!t) return 'Trainee not found';
      const r = room.round;
      if (r && r.status === 'live' && r.performerId === id) return "Can't remove the trainee on the call";
      room.trainees = room.trainees.filter(x => x.id !== id);
      if (r && r.status === 'live') {
        r.scorerIds = r.scorerIds.filter(x => x !== id);
        delete r.subs[id];
      }
      for (const ws of sockets.get(room.code) || []) {
        if (ws.ctx.traineeId === id) { ws.ctx.traineeId = null; ws.ctx.removed = true; }
      }
      return { toast: t.name.split(' ')[0] + ' removed' };
    },
    startRound(room, { performerId }) {
      if (room.stage !== 'room') return 'The session has ended';
      if (room.round) return 'A round is already running';
      const joined = room.trainees.filter(t => t.status === 'joined');
      if (!joined.some(t => t.id === performerId)) return 'That trainee is not in the room';
      if (joined.length < 2) return 'You need at least 2 trainees in the room';
      room.round = {
        n: room.rounds.length + 1, performerId, start: Date.now(), status: 'live',
        scorerIds: joined.filter(t => t.id !== performerId).map(t => t.id), subs: {}, result: null,
      };
      return { event: 'round-started' };
    },
    cancelRound(room) {
      if (!room.round || room.round.status !== 'live') return 'No live round';
      room.round = null;
      return { toast: 'Round cancelled', event: 'round-cancelled' };
    },
    endRound(room) {
      const r = room.round;
      if (!r || r.status !== 'live') return 'No live round';
      if (!Object.keys(r.subs).length) return 'Wait for at least one scorecard';
      r.status = 'review';
      r.result = computeRound(r.subs, room.settings);
      room.rounds.push({ n: r.n, performerId: r.performerId, result: r.result });
      return { event: 'round-revealed' };
    },
    nextRound(room) {
      if (room.round && room.round.status === 'live') return 'A round is still live';
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
      if (!r || r.status !== 'live') return 'This round is no longer live';
      if (!r.scorerIds.includes(ctx.traineeId)) return "You're not scoring this round";
      if (r.subs[ctx.traineeId]) return 'Scorecard already submitted';
      if (!validAnswers(answers, room.settings)) return 'Answer every attribute before submitting';
      r.subs[ctx.traineeId] = Object.fromEntries(Object.entries(answers).filter(([k]) => /^a\d+$/.test(k)));
      return {};
    },
  };

  // Join by name. Claims an invited slot with that name, or a joined slot whose owner is offline
  // (same person reopening the link); otherwise adds a new trainee.
  function join(room, ws, name) {
    name = clean(name);
    if (!name) return fail(ws, 'Enter your name to join');
    let t = room.trainees.find(x => sameName(x.name, name));
    if (t && t.status === 'joined' && online(room, t.id)) return fail(ws, `${t.name} is already in the room on another device`);
    if (!t) {
      t = { id: 't' + token().slice(0, 10), name, status: 'invited', c: room.colorSeq++ % 7, token: null };
      room.trainees.push(t);
    }
    t.status = 'joined';
    t.token = token();
    ws.ctx.traineeId = t.id;
    ws.ctx.removed = false;
    ws.send(JSON.stringify({ type: 'identity', code: room.code, id: t.id, token: t.token }));
    broadcast(room, { kind: 'joined', name: t.name });
  }

  function onMessage(ws, msg) {
    if (msg.type === 'hello') {
      const room = rooms.get(String(msg.code || '').toUpperCase());
      if (!room) return ws.send(JSON.stringify({ type: 'no-room' }));
      if (ws.ctx.code) sockets.get(ws.ctx.code)?.delete(ws);
      ws.ctx = { code: room.code, role: 'trainee', traineeId: null };
      if (msg.role === 'host') {
        if (msg.hostKey !== room.hostKey) return ws.send(JSON.stringify({ type: 'not-host' }));
        ws.ctx.role = 'host';
      } else if (msg.id && msg.token) {
        const t = room.trainees.find(x => x.id === msg.id && x.token === msg.token);
        if (t) ws.ctx.traineeId = t.id;
      }
      if (!sockets.has(room.code)) sockets.set(room.code, new Set());
      sockets.get(room.code).add(ws);
      return broadcast(room); // presence changed
    }

    const room = rooms.get(ws.ctx.code);
    if (!room) return fail(ws, 'Not connected to a room');

    if (msg.type === 'join') {
      if (ws.ctx.role !== 'trainee') return fail(ws, 'The trainer console cannot join as a trainee');
      return join(room, ws, msg.name);
    }

    const handler = ws.ctx.role === 'host' ? hostActions[msg.type] : traineeActions[msg.type];
    if (!handler) return fail(ws, 'Not allowed');
    if (ws.ctx.role === 'trainee' && !ws.ctx.traineeId) return fail(ws, 'Join the room first');
    const out = handler(room, msg, ws.ctx);
    if (typeof out === 'string') return fail(ws, out);
    if (out.toast) ws.send(JSON.stringify({ type: 'toast', message: out.toast }));
    broadcast(room, out.event ? { kind: out.event } : null);
  }

  // ---------- wiring ----------
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  wss.on('connection', ws => {
    ws.ctx = {};
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', data => {
      let msg;
      try { msg = JSON.parse(data); } catch { return; }
      if (msg && typeof msg.type === 'string') onMessage(ws, msg);
    });
    ws.on('close', () => {
      const set = sockets.get(ws.ctx.code);
      if (!set) return;
      set.delete(ws);
      const room = rooms.get(ws.ctx.code);
      if (room) broadcast(room);
    });
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);
  heartbeat.unref();

  function attach(httpServer) {
    httpServer.on('upgrade', (req, socket, head) => {
      if (new URL(req.url, 'http://x').pathname !== '/ws') return; // leave other upgrades (e.g. Vite HMR) alone
      wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    });
  }

  // Connect-style middleware for the tiny REST surface.
  function api(req, res, next) {
    if (req.url === '/healthz') return res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    if (req.method === 'POST' && req.url === '/api/rooms') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 8192) req.destroy(); });
      req.on('end', () => {
        let input = {};
        try { input = JSON.parse(body || '{}'); } catch { /* use defaults */ }
        const out = createRoom(input);
        res.writeHead(out ? 201 : 503, { 'content-type': 'application/json' });
        res.end(JSON.stringify(out || { error: 'Too many open rooms — try again later' }));
      });
      return;
    }
    next();
  }

  return { attach, api, rooms };
}
