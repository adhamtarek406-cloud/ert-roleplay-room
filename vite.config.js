import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHub } from './server/rooms.js';

// Mounts the room hub (REST + WebSocket) inside the dev server so `npm run dev` is all you need.
const roomHub = () => ({
  name: 'room-hub',
  configureServer(server) {
    const hub = createHub({ dataFile: 'data/rooms.dev.json' });
    server.middlewares.use(hub.api);
    hub.attach(server.httpServer);
  },
});

export default defineConfig({
  plugins: [react(), roomHub()],
  server: { host: true, watch: { ignored: ['**/data/**'] } },
});
