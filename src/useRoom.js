import { useCallback, useEffect, useRef, useState } from 'react';

// Host keys persist per browser; trainee identity is per tab (sessionStorage) so several
// trainees can be tested from one browser, and reopening the link reclaims the slot by name.
export const hostKeyFor = code => { try { return localStorage.getItem('rr:host:' + code); } catch { return null; } };
export const saveHostKey = (code, key) => { try { localStorage.setItem('rr:host:' + code, key); } catch { /* private mode */ } };
const identityFor = code => { try { return JSON.parse(sessionStorage.getItem('rr:me:' + code)); } catch { return null; } };
const saveIdentity = (code, v) => { try { sessionStorage.setItem('rr:me:' + code, JSON.stringify(v)); } catch { /* private mode */ } };

const wsUrl = () => (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';

export function useRoom(code, role) {
  const [snap, setSnap] = useState(null); // { room, you, now }
  const [status, setStatus] = useState('connecting'); // connecting | open | closed | no-room | not-host
  const [toast, setToast] = useState(null);
  const [offset, setOffset] = useState(0); // server clock - local clock
  const wsRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = useCallback(message => {
    setToast({ message, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let timer = null;

    function connect() {
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;
      setStatus(s => (s === 'open' ? 'connecting' : s));
      ws.onopen = () => {
        retry = 0;
        const me = identityFor(code);
        ws.send(JSON.stringify(role === 'host'
          ? { type: 'hello', code, role: 'host', hostKey: hostKeyFor(code) }
          : { type: 'hello', code, role: 'trainee', id: me?.id, token: me?.token }));
      };
      ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'state') {
          setStatus('open');
          setOffset(msg.now - Date.now());
          setSnap({ room: msg.room, you: msg.you, event: msg.event });
          if (msg.event?.kind === 'joined' && role === 'host') showToast(msg.event.name.split(' ')[0] + ' joined the room');
        } else if (msg.type === 'identity') {
          saveIdentity(msg.code, { id: msg.id, token: msg.token });
          showToast("You're in the room");
        } else if (msg.type === 'toast' || msg.type === 'error') {
          showToast(msg.message);
        } else if (msg.type === 'no-room' || msg.type === 'not-host') {
          closed = true;
          setStatus(msg.type);
          ws.close();
        }
      };
      ws.onclose = () => {
        if (closed) return;
        setStatus('closed');
        timer = setTimeout(connect, Math.min(8000, 500 * 2 ** retry++));
      };
    }
    connect();
    return () => { closed = true; clearTimeout(timer); wsRef.current?.close(); };
  }, [code, role, showToast]);

  const send = useCallback((type, payload = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...payload }));
    else showToast('Reconnecting — try again in a moment');
  }, [showToast]);

  return { room: snap?.room, you: snap?.you, status, toast, showToast, send, offset };
}

// Re-renders every second while `active`, returning server-aligned now.
export function useNow(active, offset) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => force(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  return Date.now() + offset;
}
