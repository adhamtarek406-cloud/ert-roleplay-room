// Cloudflare deployment: a Worker serves the built client (dist/) and routes each room to its own
// Durable Object, which holds the room state in storage and the room's WebSockets (hibernatable).
import { DurableObject } from 'cloudflare:workers';
import { authenticate, handle, newCode, newRoom, snapshot } from '../server/core.js';

const ROOM_TTL = 7 * 24 * 60 * 60 * 1000; // idle rooms are deleted after a week

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/healthz') return new Response('ok');

    if (url.pathname === '/api/rooms' && req.method === 'POST') {
      let input = {};
      try { input = await req.json(); } catch { /* use defaults */ }
      for (let i = 0; i < 5; i++) { // retry on the rare code collision
        const code = newCode();
        const out = await env.ROOMS.get(env.ROOMS.idFromName(code)).init(code, input);
        if (out) return Response.json(out, { status: 201 });
      }
      return Response.json({ error: 'Could not allocate a room code — try again' }, { status: 503 });
    }

    if (url.pathname === '/ws') {
      const code = (url.searchParams.get('code') || '').toUpperCase();
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      if (!/^ERT-\d{4}$/.test(code)) return new Response('Bad room code', { status: 400 });
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(req);
    }

    return env.ASSETS.fetch(req); // SPA routes fall back to index.html (see wrangler.jsonc)
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { this.room = (await ctx.storage.get('room')) || null; });
  }

  async init(code, input) {
    if (this.room) return null;
    this.room = newRoom(code, input);
    await this.save();
    return { code, hostKey: this.room.hostKey };
  }

  async fetch() {
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({});
    return new Response(null, { status: 101, webSocket: client });
  }

  async save() {
    this.room.lastActive = Date.now();
    await this.ctx.storage.put('room', this.room);
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL);
  }

  async alarm() {
    if (!this.room) return;
    const idleSince = this.room.lastActive || this.room.createdAt;
    if (Date.now() - idleSince >= ROOM_TTL && this.ctx.getWebSockets().length === 0) {
      await this.ctx.storage.deleteAll();
      this.room = null;
    } else {
      await this.ctx.storage.setAlarm(idleSince + ROOM_TTL);
    }
  }

  peers(except) { return this.ctx.getWebSockets().filter(ws => ws !== except); }
  ctxOf(ws) { return ws.deserializeAttachment() || {}; }
  onlineIds(except) { return new Set(this.peers(except).map(ws => this.ctxOf(ws).traineeId).filter(Boolean)); }
  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch { /* closing */ } }

  async broadcast(event, except) {
    await this.save();
    const online = this.onlineIds(except);
    for (const ws of this.peers(except)) {
      const ctx = this.ctxOf(ws);
      if (ctx.role) this.send(ws, { ...snapshot(this.room, ctx, online), event: event || null });
    }
  }

  async webSocketMessage(ws, data) {
    let msg;
    try { msg = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'hello') {
      if (!this.room || String(msg.code || '').toUpperCase() !== this.room.code) return this.send(ws, { type: 'no-room' });
      const ctx = authenticate(this.room, msg);
      if (ctx === 'not-host') return this.send(ws, { type: 'not-host' });
      ws.serializeAttachment(ctx);
      return this.broadcast(null); // presence changed
    }
    const ctx = this.ctxOf(ws);
    if (!this.room || !ctx.role) return this.send(ws, { type: 'error', message: 'Not connected to a room' });

    const out = handle(this.room, ctx, msg, this.onlineIds());
    if (out.error) return this.send(ws, { type: 'error', message: out.error });
    ws.serializeAttachment(ctx); // join sets traineeId
    if (out.removedId) {
      for (const p of this.peers()) {
        const pc = this.ctxOf(p);
        if (pc.traineeId === out.removedId) p.serializeAttachment({ ...pc, traineeId: null, removed: true });
      }
    }
    if (out.identity) this.send(ws, out.identity);
    if (out.toast) this.send(ws, { type: 'toast', message: out.toast });
    await this.broadcast(out.event ? { kind: out.event, name: out.eventName } : null);
  }

  async webSocketClose(ws, code) {
    try { ws.close(code === 1005 ? 1000 : code, 'closing'); } catch { /* already closed */ }
    if (this.room) await this.broadcast(null, ws);
  }

  async webSocketError(ws) {
    if (this.room) await this.broadcast(null, ws);
  }
}
