# Deep Dive Research Agent

A demo project for learning the Vercel AI SDK end to end.

The app lets a user ask a research question in chat. The assistant responds quickly, starts a background multi-stage research task, streams stage progress back into the same message, tracks token usage and cost, and exposes task history in an admin panel.

## Planned Stack

- Runtime: Bun
- API: Hono
- Frontend: Vite + React + TypeScript
- AI SDK: `ai` with OpenRouter as the active provider path
- Database: PGlite
- ORM: Drizzle
- Validation: Zod
- API docs: Scalar
- Styling: minimal React UI first, optional shadcn/ui components where they save time

## Project Layout

```txt
apps/
  server/        Hono API, scheduler, AI pipeline, database, Scalar docs
  web/           React chat UI and admin UI
packages/
  shared/        Shared Zod schemas and typed DTOs
PHASES.md        Build plan
Instructions.md Original brief
```

## Quick Start

Install dependencies after scaffolding:

```bash
bun install
```

Create an environment file:

```bash
cp .env.example .env
```

Required environment variables for the first working version:

```bash
ACTIVE_PROVIDER=openrouter
PORT=3000
PGLITE_DATA_DIR=../../.data/pglite
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
APP_URL=http://localhost:5173
SERVER_URL=http://localhost:3000
```

Optional provider variables are kept in `.env.example` so we can add direct providers later without changing the project shape. For now, only OpenRouter needs to work.

Run the server:

```bash
bun run dev:server
```

Run the web app:

```bash
bun run dev:web
```

Run the Phase 1 pipeline directly from the server package:

```bash
bun run --cwd apps/server pipeline:dev "What are the main tradeoffs between SQLite, DuckDB, and Postgres for analytics workloads?"
```

Expected local URLs:

- Web app: `http://localhost:5173`
- API: `http://localhost:3000`
- API docs: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`
- Admin UI: `http://localhost:5173/admin`

## Local Chat Test

Start both processes, then send a message from the web app:

```bash
bun run dev:server
```

```bash
bun run dev:web
```

The current chat flow creates a background task, runs the research pipeline, writes events to PGlite, and streams progress into the assistant message over SSE. This is the real localhost test path before the final AI SDK `streamText` message-part integration.

## PGlite Troubleshooting

PGlite is an embedded database, so only run one API server against the same `PGLITE_DATA_DIR` at a time. If startup fails with `RuntimeError: Aborted()`, stop all running `bun` server processes, then restart `bun run dev:server`.

If the local database directory is corrupted during development, remove `.data` and start the server again. This deletes local task history only.

## API Manager

The project uses Scalar at `/docs` as the API manager/reference UI. It is the best fit for this stack right now because it plugs directly into Hono, reads our OpenAPI document, and gives a Swagger-like testing surface without adding a heavier framework.

## Development Priorities

1. Build the AI pipeline as pure functions first.
2. Add usage and cost tracking around every LLM call.
3. Persist tasks, events, and LLM calls.
4. Add background scheduling and SSE.
5. Connect chat to task creation.
6. Build the minimal frontend and admin panel.
7. Add Scalar docs and final delivery cleanup.

## Execution Plan

Use this order while building:

1. Install dependencies with `bun install`.
2. Start with `packages/shared` schemas and server-side model config.
3. Implement the pipeline runner as a CLI/dev command before connecting HTTP.
4. Add PGlite and Drizzle persistence.
5. Add the scheduler and SSE task stream.
6. Add the `/chat` endpoint and `startResearch` tool.
7. Connect the React chat UI.
8. Add `/admin` and `/docs`.
9. Run typecheck and manual acceptance tests.

OpenRouter is the only provider required for the first executable path. The model config should still group models by role so we can route to direct OpenAI, Anthropic, Google, or other providers later if paid keys become available.

## Delivery Notes

Before sharing the project, run the cleanup script once it exists:

```bash
bun run cleanup
```

The final zip should include source and config only. Do not include `.env`, API keys, `node_modules`, build output, or local PGlite data.
