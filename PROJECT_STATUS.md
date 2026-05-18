# Project Status

Last updated: UI and Phase 1 scaffold pass.

## Stack Decision

- API manager: Scalar at `/docs`.
- OpenAPI source: maintained document in `apps/server/src/openapi/document.ts`.
- Active LLM provider: OpenRouter.
- Database: PGlite through Drizzle.
- Frontend: Vite + React.

Scalar is preferred over Swagger UI for this project because it is lightweight, modern, and fits Hono well. Swagger UI would also work, but Scalar gives the same practical API exploration value with less UI friction.

## Phase Alignment

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0 - Setup and Decisions | Mostly done | Bun workspace, Hono, React, PGlite, OpenRouter env, Scalar, README, cleanup script, and app shell exist. |
| Phase 1 - AI Pipeline First | Started | Schemas, pipeline functions, usage wrapper, and dev runner exist. Needs live OpenRouter tuning and persistence integration. |
| Phase 2 - Database and Telemetry | Started | Tables and DB boot exist. Missing persistence helpers, `withUsage`, cost aggregation, and real task writes. |
| Phase 3 - Scheduler and SSE | Started | Placeholder SSE route exists. Missing registry, emitters, pipeline orchestration, replay, and ledger events. |
| Phase 4 - Chat API | Started | `/chat` validates requests and returns a stub response. Missing AI SDK `streamText`, `startResearch` tool, and `data-task` parts. |
| Phase 5 - Frontend Chat | Started | Page structure and API-backed composer work. Missing `@ai-sdk/react`, real chat transport, `TaskStream`, and token meter. |
| Phase 6 - Admin and API Docs | Started | Scalar docs, admin APIs, and phase-status admin UI exist. Missing real task table/detail drawer and telemetry summaries. |
| Phase 7 - Final Pass | Not started | Needs acceptance test pass, cost check, README finalization, cleanup validation, and reflection. |

## Next Best Work

1. Run the Phase 1 pipeline against OpenRouter and tune prompts/models if the free router returns weak structured output.
2. Persist pipeline runs into `tasks`, `task_events`, and `llm_calls`.
3. Replace placeholder SSE with a real task event stream.
4. Connect `/chat` to `startResearch`.
5. Replace the stub chat response with the AI SDK UI message stream and `TaskStream`.
