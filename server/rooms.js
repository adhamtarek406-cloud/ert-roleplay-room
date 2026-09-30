// Node transport for the room core: in-memory rooms (snapshotted to a JSON file) + a WebSocket hub.
// Used by `npm run dev` (mounted in Vite) and `npm start`. Production on Cloudflare uses worker/index.js.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { WebSocketServer } from 'ws';
import { authenticate, handle, newCode, newRoom, snapshot } from './core.js';

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

  // Forget rooms nobody has touched in a day, and cap the total.
  const ROOM_TTL = 24 * 60 * 60 * 1000;
  const MAX_ROOMS = 500;
  function createRoom(input) {
    const cutoff = Date.now() - ROOM_TTL;
    for (const [code, room] of rooms) {
      if (room.lastActive < cutoff && !sockets.get(code)?.size) rooms.delete(code);
    }
    if (rooms.size >= MAX_ROOMS) return null;
    let code;
    do code = newCode(); while (rooms.has(code));
    const room = newRoom(code, input);
    rooms.set(code, room);
    persist();
    return { code, hostKey: room.hostKey };
  }

  const peers = code => [...(sockets.get(code) || [])];
  const onlineIds = room => new Set(peers(room.code).map(ws => ws.ctx.traineeId).filter(Boolean));
  const send = (ws, msg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));

  function broadcast(room, event) {
    room.lastActive = Date.now();
    persist();
    const online = onlineIds(room);
    for (const ws of peers(room.code)) send(ws, { ...snapshot(room, ws.ctx, online), event: event || null });
  }

  function onMessage(ws, msg) {
    if (msg.type === 'hello') {
      const room = rooms.get(String(msg.code || '').toUpperCase());
      if (!room) return send(ws, { type: 'no-room' });
      const ctx = authenticate(room, msg);
      if (ctx === 'not-host') return send(ws, { type: 'not-host' });
      if (ws.code) sockets.get(ws.code)?.delete(ws);
      ws.code = room.code;
      ws.ctx = ctx;
      if (!sockets.has(room.code)) sockets.set(room.code, new Set());
      sockets.get(room.code).add(ws);
      return broadcast(room); // presence changed
    }
    const room = rooms.get(ws.code);
    if (!room) return send(ws, { type: 'error', message: 'Not connected to a room' });

    const out = handle(room, ws.ctx, msg, onlineIds(room));
    if (out.error) return send(ws, { type: 'error', message: out.error });
    if (out.removedId) {
      for (const p of peers(room.code)) if (p.ctx.traineeId === out.removedId) p.ctx = { ...p.ctx, traineeId: null, removed: true };
    }
    if (out.identity) send(ws, out.identity);
    if (out.toast) send(ws, { type: 'toast', message: out.toast });
    broadcast(room, out.event ? { kind: out.event, name: out.eventName } : null);
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
      const set = sockets.get(ws.code);
      if (!set) return;
      set.delete(ws);
      const room = rooms.get(ws.code);
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
