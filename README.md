# ERT Role-play Room

Live role-play training for the Experience Recovery team. A trainer opens a room and shares the link. One trainee takes the call while the trainer plays the customer, and everyone else scores them live on the ERT scorecard. The trainer reveals each round's results, and the session ends with a leaderboard.

Built from the Claude Design project *Roleplay Room* using the Tamara Design System (tokens, Button, Badge and Icon ported into `src/ds`).

## Run

```bash
npm install
npm run dev          # http://localhost:5173 — client + Node room server in one process
npm test             # end-to-end: host + 3 trainees over real WebSockets
npm run dev:worker   # the Cloudflare build, locally on http://localhost:8787
```

To try it alone, create a room at `/`, then open the room link in other tabs. Trainee identity is kept per tab, so each tab can be a different trainee.

## Deploy (Cloudflare Workers — free, no card)

Production runs on Cloudflare. `worker/index.js` serves the built client and gives each room its own Durable Object, which keeps the room state in storage and holds the room's WebSockets. Rooms survive restarts and deploys, and a room that's idle for a week is deleted.

Every push to `main` runs `.github/workflows/deploy.yml`: test, build, deploy to `https://ert-roleplay-room.<your-subdomain>.workers.dev`. One-time setup: create a Cloudflare API token from the **Edit Cloudflare Workers** template and add it to this repo as the Actions secret `CLOUDFLARE_API_TOKEN`. To deploy from your own machine instead, run `npx wrangler login` and then `npm run deploy`.

`Dockerfile`, `render.yaml` and `npm start` (Node server on port 8787) are kept for container hosts if you ever move off Cloudflare.

## How it fits together

| Path | What |
|---|---|
| `shared/scorecard.js` | ERT scorecard (7 categories, 16 attributes, weights, auto-fail rules) and scoring math, shared by server and client |
| `server/core.js` | Authoritative room rules. Clients send intents; the core validates them and builds each viewer's snapshot |
| `worker/index.js` | Cloudflare transport: Worker + one Durable Object per room (production) |
| `server/rooms.js`, `server/index.js` | Node transport: in-memory rooms (snapshotted to `data/`) + WebSocket hub, mounted in Vite for dev |
| `src/views/` | `CreateRoom` (`/`), `HostConsole` (`/room/:code/host`), `TraineeRoom` (`/room/:code`), shared `Results` |

**Rules the server enforces:** only the browser that created the room (it holds the host key) can run it. Individual answers never leave the server; before the reveal the trainer only sees who has submitted. The performer can't score themselves. A scorecard must have every attribute answered.

**Identity:** trainees join by name. Tapping a name the trainer pre-invited claims that slot, and reopening the link with the same name reconnects someone who went offline.
