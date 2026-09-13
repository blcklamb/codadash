# codadash (코다대시)

Code typing practice and real-time 1v1 code-rain battles. React + TypeScript + Vite, Express + Socket.IO, optional Supabase GitHub authentication and PostgreSQL record storage.

## Run locally

Requires Node.js 24 LTS and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open http://127.0.0.1:5173. The game server listens on port 3001. Vite proxies HTTP and WebSocket traffic. Guest practice, daily challenges, device-local records, and real 1v1 matches run without any external credentials. Use two separate browser profiles/incognito contexts to test two players; one identity cannot occupy both slots.

## Documents

- [Product plan](docs/PRODUCT.md): purpose, audience, user journeys, visual direction, launch scope.
- [Requirements](docs/REQUIREMENTS.md): authoritative rules, input, metrics, rooms, failure handling, acceptance criteria.
- [Codex implementation prompt](docs/CODEX_PROMPT.md): reusable handoff instructions.
- [Operations](docs/OPERATIONS.md): GitHub login, database setup, deployment, monitoring, limitations.
- [Validation](docs/VALIDATION.md): completed checks and outstanding external checks.

## Commands

```sh
npm run check:supabase # Read-only hosted Supabase configuration check
npm run check          # TypeScript
npm test               # Rules/content/server integration tests
npm run build          # Static frontend + Node server bundle
npm run test:e2e       # Chromium, Firefox, WebKit
npm run load           # 20 rooms + 10 solo players, 30 minutes
```

Install test browsers once with `npx playwright install chromium firefox webkit`.
For a short load smoke test: `LOAD_MINUTES=1 LOAD_ROOMS=2 LOAD_PRACTICES=1 npm run load`. Run long load checks against a production build, not a watch-mode server being edited.

## Layout

- `apps/web`: client UI, localization, prediction, records, settings.
- `apps/server`: authenticated HTTP API, rooms, authoritative real-time simulation and persistence.
- `packages/shared`: deterministic content, pure typing/battle engines, calendar logic.
- `supabase/migrations`: PostgreSQL schema, indexes and RLS.
- `tests`: rules, integration, browser journeys and reproducible load runner.

No uploaded or displayed code is executed. There is no public ranking, automatic matchmaking, chat, or payment system in v1. Guest data is local to the browser and is not automatically merged into account records.
