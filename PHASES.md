# Deep Dive Research Agent - Phases

This project is a demoable Vercel AI SDK learning build. The priority is a working end-to-end system over polish.

## Phase 0 - Setup and Decisions

Goal: create a stable project base that can be built quickly.

- Use a Bun workspace with `apps/server`, `apps/web`, and `packages/shared`.
- Use Hono for the API server.
- Use Vite + React + TypeScript for the frontend.
- Use PGlite + Drizzle for the embedded database.
- Use OpenRouter as the active LLM gateway because it is the available/free path for now.
- Keep `.env.example` ready for direct provider keys so OpenAI, Anthropic, Google, or other providers can be added later without changing the architecture.
- Use Scalar for API documentation.
- Keep model IDs and pricing in one shared server-side config module.
- Add `.env.example`, cleanup scripts, and development scripts.

Exit criteria:

- Workspace installs successfully.
- Server and web apps can start independently.
- README documents setup and required API keys.

## Phase 1 - AI Pipeline First

Goal: prove the research pipeline without HTTP or UI complexity.

- Add shared Zod schemas for:
  - question decomposition
  - research angles
  - scored findings
  - final report
- Implement three pure pipeline stages:
  - decompose
  - research loop
  - synthesize
- Add `withUsage` so every LLM call records usage and estimated cost.
- Add fallback handling and typed fallback shapes.
- Add a small CLI/dev runner for one sample research question.

Exit criteria:

- One command runs the full pipeline.
- Logs show each LLM call, token usage, model, and cost.
- No model ID strings are inlined outside the model config.
- Only OpenRouter is required to execute the first working pipeline.

## Phase 2 - Database and Telemetry

Goal: persist tasks, events, and LLM call history.

- Create Drizzle schema for:
  - `tasks`
  - `task_events`
  - `llm_calls`
- Initialize PGlite on server startup.
- Persist each stage event.
- Persist every LLM usage record.
- Add cost aggregation helpers.

Exit criteria:

- Completed pipeline output is stored.
- Admin queries can compute task status, duration, call count, tokens, and total cost.

## Phase 3 - Scheduler and SSE

Goal: run research in the background and stream progress.

- Add singleton task registry.
- Add per-task event emitters.
- Add `runPipeline(taskId)` orchestration.
- Add `GET /tasks/:id/events` SSE endpoint.
- Replay historical events before streaming live events.
- Emit ledger updates after every LLM call.

Exit criteria:

- A task keeps running after the request that started it finishes.
- An SSE client receives stage and ledger events in real time.

## Phase 4 - Chat API

Goal: connect chat to the background task system.

- Add `POST /chat`.
- Use `streamText` for a fast assistant acknowledgement.
- Add a `startResearch` tool that schedules the background pipeline.
- Emit a custom `data-task` message part with the `taskId`.
- Keep the chat response under one second for normal startup.

Exit criteria:

- Chat starts a task and returns quickly.
- The frontend can discover the `taskId` from the streamed message parts.

## Phase 5 - Frontend Chat

Goal: build the minimal UI needed for the demo.

- Add chat screen using `@ai-sdk/react`.
- Render normal text parts.
- Render `data-task` parts as a `TaskStream` component.
- Use `EventSource` to subscribe to task updates.
- Show stage output inline in the original assistant message.
- Show a compact token/cost/call-count widget.

Exit criteria:

- The same assistant message updates as the task progresses.
- A second chat message can be sent while the first task is still running.

## Phase 6 - Admin and API Docs

Goal: expose observability and make the API inspectable.

- Add admin routes:
  - `GET /admin/tasks`
  - `GET /admin/tasks/:id`
- Add OpenAPI generation or a maintained OpenAPI document.
- Serve Scalar API reference, likely at `/docs`.
- Build `/admin` UI with task table and detail drawer.

Exit criteria:

- `/admin` lists all tasks with status, duration, total tokens, total cost, and final output.
- Task detail shows every LLM call and event.
- `/docs` opens Scalar API documentation for the backend routes.

## Phase 7 - Final Pass

Goal: make the project deliverable.

- Test the acceptance criteria manually.
- Verify cost math against a hand calculation.
- Add cleanup script for zip delivery.
- Add final README notes and known limitations.
- Ensure `.env` is ignored and `.env.example` is complete.
- Write the short reflection requested by the brief.

Exit criteria:

- The project is demoable.
- The repo contains source, config, README, `.env.example`, and cleanup script.
- No API keys, `node_modules`, build artifacts, or local PGlite data are included.

## Execution Notes

Follow the phases in order. Do not start with the UI beyond the scaffold. The fastest stable path is:

1. Make the pipeline run from a server-side dev command.
2. Persist its events and usage.
3. Stream those events over SSE.
4. Attach chat only after the scheduler works.
5. Add the admin page once task data is real.

Provider rule:

- Active execution path: OpenRouter.
- Optional future direct providers: OpenAI, Anthropic, Google.
- Keep all model names centralized in the server model config.
- Keep provider environment variables documented, but do not block execution on providers we are not actively using.
