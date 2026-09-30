---
title: ERT Role-play Room
emoji: 🎧
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

# ERT Role-play Room

Live role-play training for the Experience Recovery team. A trainer opens a room and shares the link. One trainee takes the call while the trainer plays the customer, and everyone else scores them live on the ERT scorecard. The trainer reveals each round's results, and the session ends with a leaderboard.

Built from the Claude Design project *Roleplay Room* using the Tamara Design System (tokens, Button, Badge and Icon ported into `src/ds`).

## Run

```bash
npm install
npm run dev        # http://localhost:5173 — client + room server in one process
npm test           # end-to-end: host + 3 trainees over real WebSockets
npm run build && npm start   # production on http://localhost:8787 (PORT to override)
```

## Deploy (Hugging Face Spaces — free, no card)

Every push to `main` runs `.github/workflows/deploy-hf.yml`, which uploads the repo to the Hugging Face Space `<your-hf-username>/ert-roleplay-room` (creating it on the first run). The Space builds the `Dockerfile` and serves the app at `https://<your-hf-username>-ert-roleplay-room.hf.space`, which is the link to share. Share that direct link rather than the huggingface.co page, which shows the app inside a frame.

One-time setup: create a Hugging Face **write** access token and add it to this GitHub repo as the Actions secret `HF_TOKEN`.

A free Space sleeps when idle (the first visit wakes it), and sleeping or redeploying clears open rooms, so create a fresh room for each session. `render.yaml` is kept as an alternative if you move to Render.

To try it alone, create a room at `/`, then open the room link in other tabs. Trainee identity is kept per tab, so each tab can be a different trainee.

## How it fits together

| Path | What |
|---|---|
| `shared/scorecard.js` | ERT scorecard (7 categories, 16 attributes, weights, auto-fail rules) and scoring math, shared by server and client |
| `server/rooms.js` | Authoritative room state + WebSocket hub. Clients send intents and the server validates them and pushes tailored snapshots |
| `server/index.js` | Production HTTP server (static `dist/` + hub). In dev the hub is mounted inside Vite (`vite.config.js`) |
| `src/views/` | `CreateRoom` (`/`), `HostConsole` (`/room/:code/host`), `TraineeRoom` (`/room/:code`), shared `Results` |

**Rules the server enforces:** only the browser that created the room (it holds the host key) can run it. Individual answers never leave the server; before the reveal the trainer only sees who has submitted. The performer can't score themselves. A scorecard must have every attribute answered.

**Identity:** trainees join by name. Tapping a name the trainer pre-invited claims that slot, and reopening the link with the same name reconnects someone who went offline.

**Persistence:** rooms live in memory and are snapshotted to `data/rooms.json` (`data/rooms.dev.json` in dev), so a restart keeps sessions. It's a single process, so run one instance.
