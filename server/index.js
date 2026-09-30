// Production server: serves the built client from dist/ and hosts the room hub.
// In development the same hub is mounted inside the Vite dev server (see vite.config.js).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHub } from './rooms.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const port = Number(process.env.PORT) || 8787;
const hub = createHub({ dataFile: process.env.DATA_FILE || join(root, 'data', 'rooms.json') });

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json',
};

async function serveStatic(req, res) {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([\\/]\.\.)+/, '');
  let file = join(dist, path);
  if (!file.startsWith(dist)) file = join(dist, 'index.html');
  try {
    if (!(await stat(file)).isFile()) throw new Error('dir');
  } catch {
    file = join(dist, 'index.html'); // SPA fallback: /room/ERT-1234 etc.
  }
  try {
    const body = await readFile(file);
    const hashed = file.includes(join('dist', 'assets'));
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(500).end('Build the client first: npm run build');
  }
}

const server = createServer((req, res) => hub.api(req, res, () => serveStatic(req, res)));
hub.attach(server);
server.listen(port, () => console.log(`Role-play room on http://localhost:${port}`));
