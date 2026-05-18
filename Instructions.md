# Vercel AI SDK Onboarding Project — "Deep Dive Research Agent"

A self-contained side project to learn the Vercel AI SDK end-to-end. You will build a chat app where the user can kick off a **long-running, multi-stage research task** from a chat message. The task runs **in the background** — the chat stays responsive — and streams progress updates back into the same assistant message as it works. A small telemetry widget in the corner of each turn shows tokens used and running cost. An admin panel surfaces all tasks, per-stage timing, and spend history.

Scope: a **working, demoable system** — not a polished product. We care about you exercising every hard part of building an AI app, not about pixel-perfect UI.

---

## Compensation & time cap

This is paid work, capped at **8 hours total**. Log your hours honestly — if you hit 8 and you're not done, stop, submit what you have, and note what's missing. The goal is exposure, not heroics. If you finish early, use remaining hours on the stretch goals in §7.

The scope below is deliberately ambitious — the 8-hour cap is your forcing function. Prioritize the **acceptance criteria in §8** over polish. A rough but functional pipeline > a beautiful broken one.

---

## A note to you, Anis

This doc is a suggestion, not a spec. Once you're hitting the fundamental concepts (the SDK primitives, the async scheduler + streaming, the token/cost ledger, the admin panel), everything else is yours to shape:

- **Use your own judgement.** Disagree with a pattern here? Pick something better and do that instead. If you have a cleaner way to structure the scheduler, the ledger, the chat↔task bridge — use it.
- **Make it your own.** Rename things. Reshape the pipeline stages. Swap providers. Pick a research topic you actually find interesting as your test question. The practice project is more useful to you when it reflects how _you_ like to build.
- **Polish if you want to.** UI is explicitly not graded, but if you enjoy the design side and want to spend part of your 8 hours making it feel nice, go ahead. Just not at the cost of §8.
- **Ask questions.** If something in this doc is unclear or feels wrong, ping us. Clarifications are cheap; rebuilding on a misunderstanding isn't.

The only hard requirements are in §8 (acceptance criteria). Everything else is a suggestion.

---

## 1. What you're building

### The user story

1. User opens a chat and asks a research question ("What are the main tradeoffs between SQLite, DuckDB, and Postgres for analytics workloads?").
2. The assistant replies in <1 second: "Kicking this off — I'll report back in a few stages." The message includes a `task-started` data chunk with a `taskId`.
3. In the background, a **three-stage pipeline** runs (see below). It emits progress events.
4. The same assistant message updates live as each stage completes — new sections appear inline, and a **token meter + cost widget** in the message's corner refreshes on every LLM call.
5. The user can send another chat message while the task runs. The task keeps going; updates keep streaming to the original message.
6. A **/admin** route shows every task ever run: status, stage timings, total tokens, total cost, and the final output.

### The three-stage pipeline (the "tough workload")

This is pure LLM work — no heavy compute — but shaped to force you to wire together scheduling, streaming, structured outputs, and multiple providers.

**Stage 1 — Decompose.** One `generateText` + `Output.object({ schema })` call breaks the question into N sub-questions (3–5). Structured output, Zod-validated.

**Stage 2 — Research loop (the big one).** For each sub-question, in parallel:

- Run a `generateText` + `Output.object()` call to propose 3 distinct research angles (schema: `{ angle: string, hypothesis: string }[]`).
- For each angle, run a plain `generateText` call (no `output`) that drafts a short findings paragraph. This is the nested loop — `N × 3` calls total.
- Run a `generateText` + `Output.object()` scoring pass that ranks the findings and picks the top 2 per sub-question.

**Stage 3 — Synthesize.** One final `generateText` + `Output.object()` call takes the top findings from every sub-question and produces the final report with a strict schema: `{ summary: string, sections: { title, body, citations }[], confidence: "low" | "medium" | "high" }`.

By the time the pipeline finishes, you've made between 10 and 30 LLM calls across at least two providers, transformed data through four distinct Zod schemas, and streamed progress to a live UI. That's the point — you'll have touched every SDK primitive that matters.

---

## 2. Tech stack (recommended)

You choose, but these make everything below easier:

| Layer      | Pick                                                      | Why                                                                                                                       |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Runtime    | **Bun**                                                   | Fast install, native TS, one binary to worry about.                                                                       |
| Server     | **Hono** + **Hono RPC (`hc`)**                            | Tiny, zero-cost type-safe client-to-server calls. Pairs naturally with the AI SDK's streaming helpers.                    |
| DB         | **PGlite** (embedded Postgres) via `@electric-sql/pglite` | Real Postgres semantics, no server process, no migrations — ideal for a learning project.                                 |
| ORM        | **Drizzle**                                               | Use `drizzle-orm/pglite`. Call `push` on startup; skip migrations entirely for this project.                              |
| Frontend   | **Vite + React 19** + `@ai-sdk/react`                     | `useChat` is the path of least resistance. Use the latest Vite.                                                           |
| Styling    | **Tailwind v4** + **shadcn/ui**                           | Tailwind v4's zero-config `@import "tailwindcss"` + shadcn components drop in quickly. Don't roll your own design system. |
| Validation | **Zod**                                                   | SDK-native, doubles as prompt surface via `.describe()`.                                                                  |

Other AI SDK packages you'll install: `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` (pick at least two providers — the project exercises cross-provider comparison).

---

## 3. Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React + useChat)                                      │
│    ├─ ChatPanel  ── streams from POST /chat                     │
│    ├─ TaskStream ── subscribes to GET /tasks/:id/events (SSE)   │
│    └─ AdminPanel ── polls GET /admin/tasks via Hono RPC client  │
└─────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Hono server (Bun)                                              │
│    POST /chat         ── streamText, returns quickly,           │
│                          schedules a task, emits taskId         │
│    GET  /tasks/:id    ── SSE stream of stage updates            │
│    GET  /admin/tasks  ── RPC: list all tasks + telemetry        │
│    GET  /admin/tasks/:id ── RPC: task detail                    │
└─────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  In-memory Scheduler (EventEmitter per task)                    │
│    ├─ TaskRegistry ── Map<taskId, TaskState>                    │
│    ├─ runPipeline(taskId) ── stage1 → stage2 (parallel) →       │
│    │                         stage3, emits "stage-*" events     │
│    └─ tokenLedger  ── accumulates usage per task + globally     │
└─────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │  PGlite (Drizzle)    │
                              │    tasks table       │
                              │    task_events table │
                              │    llm_calls table   │
                              └──────────────────────┘
```

### Why this shape

- **The chat turn returns fast.** `POST /chat` runs `streamText` with a _short_ system prompt like "Acknowledge the user's question, promise to report back, and call the `startResearch` tool." It schedules the pipeline via `tools` and returns. Total chat latency: ~1 second.
- **The pipeline runs off the chat request.** Scheduler owns it. Chat request exits. Task keeps running.
- **Progress streams via SSE on a separate endpoint** keyed by `taskId`. The frontend opens that stream when it sees the `task-started` data chunk. This is the trick to "async chat with live message updates" — the assistant message renders both (a) the short streamed response and (b) everything arriving on the SSE stream afterwards.
- **Telemetry is a small ledger** updated on every LLM call. The SSE stream emits ledger updates alongside stage events, so the token/cost widget refreshes in real time.

### Repo structure — your call

Organize the repo however you're most comfortable. If you already have a single-package structure you trust, use it. If you've never set up a TS project from scratch and want a recommendation, **use Turborepo** (`bunx create-turbo@latest`) with two packages — one for the Hono server, one for the Vite web app — and a shared workspace package for Zod schemas so the RPC types and the schema definitions are imported by both sides. That structure is what the rest of this doc quietly assumes, but nothing downstream depends on it.

Whatever you pick, the non-negotiables are:

- Models, pricing, and the `withUsage` wrapper live in **one place** and are imported everywhere. Never inline a model ID string.
- Zod schemas that cross the wire (chat request bodies, RPC responses, the pipeline's four stage shapes) are importable by both the server and the web app without going through `fetch` — so either keep everything in one package, or share them through a workspace.
- The scheduler (in-memory `Map` + per-task `EventEmitter`) is a singleton owned by the server process. Don't try to split it across packages.

Don't let the structure decision eat into your build time. Pick something reasonable and move on.

---

## 4. Learning goals (what you should know when you finish)

Each goal maps to at least one file you'll write.

### Core SDK primitives

- [ ] **`streamText`** — you've used it for the chat turn with `onFinish`, `onAbort`, `smoothStream`, `stopWhen: stepCountIs(5)`.
- [ ] **`generateText` + `Output.object({ schema })`** — the v6 way to get typed structured output. Used in all three stages. (There's no `generateObject` in v6 — `Output.object()` passed to `generateText` is the replacement.)
- [ ] **Plain `generateText`** (no `output`) — used inside stage 2 for freeform findings paragraphs.
- [ ] **`tool({...})`** — `startResearch` is a tool the chat model calls. Its `execute` spawns the task and returns a `taskId`.

### Multi-step + message-parts

- [ ] **`stopWhen: stepCountIs(N)`** — chat turn should be capped.
- [ ] **Message parts** — you can name what each of these is and when you'd see it: `text`, `reasoning`, `tool-call`, `tool-result`, `source-url`, `data-*`.
- [ ] **Custom data chunks** — `writer.write({ type: "data-task", data: { taskId } })` is how the frontend learns the task ID. You also emit `data-ledger` updates with running token/cost.
- [ ] **`toUIMessageStream({ sendReasoning: true })`** and `createUIMessageStreamResponse`.

### Frontend

- [ ] **`useChat`** from `@ai-sdk/react` — driving chat state.
- [ ] **`DefaultChatTransport`** with a `prepareSendMessagesRequest` hook (inject something — even just a session ID).
- [ ] **Custom message-part rendering** — you render `data-task` parts as the `<TaskStream />` component inside the message.
- [ ] **SSE consumption** — `new EventSource(...)` for task updates, merged into the same message.

### Providers + provider options

- [ ] At least **two providers** used in the pipeline (e.g., one cheap model for angle generation, one strong model for synthesis).
- [ ] **`providerOptions`** used for reasoning/thinking in at least one call (OpenAI `reasoningEffort`, Anthropic `thinking`, or Google `thinkingConfig`).
- [ ] **Model constants file** — one central module holding `LLM_MODELS` + `MODEL_PRICING`. Zero inlined model ID strings anywhere else.

### Data flow through shapes

- [ ] Four distinct Zod schemas, chained: `Question → SubQuestions[] → Angles[] → ScoredFindings[] → Report`.
- [ ] Every `.describe()` filled in (the schema is prompt surface, not just validation).
- [ ] Post-LLM transforms where needed (array → Record, or flattening).

### Observability

- [ ] **`withUsage` wrapper** — every AI SDK call routes through a helper that takes `{ label, model }` + the call fn, runs it, and records `result.usage` to the per-task ledger. No LLM call escapes tracking.
- [ ] **Cost math** — `MODEL_PRICING[id] × usage.inputTokens / 1_000_000 + ...`. Reasoning tokens accounted separately (`usage.outputTokenDetails?.reasoningTokens`).
- [ ] **Token meter in chat** refreshes as `data-ledger` parts arrive.

### Error handling

- [ ] `maxRetries: 3` on normal calls.
- [ ] A typed fallback shape returned on catch — downstream code can't tell the difference between success and handled failure.
- [ ] `createFallbackModel` used once (e.g., synthesize falls back to a cheaper model if the primary errors).
- [ ] Hard timeout (`Promise.race`) on at least one call.

### Scheduling + streaming coordination

- [ ] Chat endpoint returns quickly (well under a second) even though the pipeline keeps running after the request closes.
- [ ] Task keeps running even after the chat request closes.
- [ ] A user can ask a second question while the first task runs.
- [ ] The original message updates live when the task finishes.

---

## 5. Build order (a suggested path)

Do it in this order — each step builds on the last and keeps you unblocked.

### Step 0 — Scaffold

```bash
# server
bun create hono research-agent
cd research-agent
bun add ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google zod
bun add drizzle-orm @electric-sql/pglite
bun add -d drizzle-kit @types/bun

# frontend (latest Vite + React 19 + Tailwind v4 + shadcn)
bun create vite@latest web -- --template react-ts
cd web
bun add @ai-sdk/react ai
bun add -d tailwindcss@next @tailwindcss/vite@next
# follow shadcn's current "manual" init — it picks up Tailwind v4 automatically:
bunx shadcn@latest init
bunx shadcn@latest add button card badge scroll-area separator table sheet
```

Tailwind v4 in Vite only needs this in `vite.config.ts`:

```ts
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({ plugins: [react(), tailwindcss()] });
```

…and this in your entry CSS file:

```css
@import "tailwindcss";
```

No `tailwind.config.js` required for v4 unless you want theme tokens.

Write `src/db/client.ts`: create PGlite, wrap with Drizzle, call `pushSchema` on boot (no migrations).

### Step 1 — Model constants + usage wrapper

- `config/models.ts` with `LLM_MODELS` + `MODEL_PRICING`.
- `ai/withUsage.ts`:
  ```ts
  export async function withUsage<T extends { usage?: LanguageModelUsage }>(
    meta: { taskId?: string; label: string; model: string },
    fn: () => Promise<T>,
  ): Promise<T> {
    const result = await fn();
    ledger.record(meta, result.usage, MODEL_PRICING[meta.model]);
    return result;
  }
  ```
  **Rule for the rest of the project: no LLM call outside `withUsage`.**

### Step 2 — The three stages as pure functions

Build `ai/decompose.ts`, `ai/research.ts`, `ai/synthesize.ts` as standalone async functions that take input, emit via a passed-in `onEvent` callback, return output. **Run them from a throwaway CLI script first** — no HTTP, no scheduler, no chat. Prove the LLM chain works on its own.

Good Zod practice:

- `Question → { subQuestions: { text, focus }[] }` — 3–5 items, use `.min(3).max(5)`.
- `SubQuestion → { angles: { angle, hypothesis }[] }` — `.length(3)`.
- Findings: plain `generateText` for the paragraph, then a scoring `generateText` + `Output.object()`.
- Synthesis: the final report schema — nested but flat-ish, enum for `confidence`.

### Step 3 — Scheduler + SSE

- `scheduler/registry.ts`: `Map<taskId, { state, emitter }>`, where `emitter` is a Node `EventEmitter`.
- `scheduler/pipeline.ts`: `runPipeline(taskId)` calls the three stages in order, `emitter.emit('stage', { ... })` between them. Persists events to `task_events` for the admin panel.
- `routes/tasks.ts`: `GET /tasks/:id/events` is SSE — subscribes to the task's emitter, replays any missed events from DB on connect, streams new ones. Keepalive every 15s.

### Step 4 — Chat turn with `startResearch` tool

- `tools/startResearch.ts`:
  ```ts
  export const startResearch = tool({
    description: "Kick off a deep-dive research pipeline for the user's question.",
    inputSchema: z.object({
      question: z.string().describe("The research question, restated clearly."),
    }),
    execute: async ({ question }) => {
      const taskId = crypto.randomUUID();
      registry.create(taskId, question);
      queueMicrotask(() => runPipeline(taskId)); // non-blocking
      return { taskId, status: "scheduled" };
    },
  });
  ```
- `routes/chat.ts`: `createUIMessageStream` + `streamText` with a tight system prompt: "Acknowledge briefly, call startResearch, tell the user the task is running." `stopWhen: stepCountIs(3)`. Leave `toolChoice` on its default (`"auto"`) — the model should decide when research is warranted and handle small-talk turns without calling the tool.
- Emit a `data-task` chunk inside `execute` of the stream so the frontend gets the `taskId` without parsing tool output.

### Step 5 — Frontend chat + task stream

- `ChatPanel.tsx`: `useChat` + `DefaultChatTransport`. Render each message, and for every `data-task` part, mount a `<TaskStream taskId={...} />`.
- `TaskStream.tsx`: opens `EventSource(/tasks/:id/events)`, renders a live list of completed stages and their outputs, and a small `<TokenMeter />` in the corner.
- `TokenMeter.tsx`: consumes `ledger` events from the same SSE stream. Shows `tokens · $cost · N calls`.

### Step 6 — Admin panel via Hono RPC

- `routes/admin.ts`: typed Hono RPC routes — `getTasks`, `getTask(id)`, `rerunTask(id, modelOverride)`.
- `web/lib/rpc.ts`: `hc<AppType>("/admin")` client.
- `AdminPanel.tsx`: table of all tasks (sortable by cost, duration, status); clicking a row opens a detail drawer with the full event log, per-stage timing, and every LLM call with its cost.

### Step 7 — Polish (open-ended, only if time allows)

Fallback model. Provider options on synthesize. Hard timeout on research calls. Replay of in-flight tasks on reconnect. Pick a stretch goal below.

### UI expectations

Use shadcn components as-is. Don't spend time customizing. Reasonable defaults:

- Chat: `Card` per message, `ScrollArea` for the log, `Button` for send, `Badge` for status chips ("scheduled", "running", "done").
- Task stream: a `Card` appended to the message with a `Separator` between stages.
- Token meter: a single-line `Badge` or small flex row pinned top-right inside the card.
- Admin panel: shadcn `Table` for the task list, `Sheet` for the detail drawer.

If something looks ugly but works, ship it. We're not grading design.

---

## 6. Reference patterns you'll need

### Custom data chunks in the chat stream

```ts
// backend
const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    const result = streamText({
      model: modelBuilder("cheap-fast").noReasoning(),
      system: CHAT_SYSTEM_PROMPT,
      messages,
      tools: { startResearch },
      stopWhen: stepCountIs(3),
      onFinish: async ({ steps }) => {
        // find the startResearch tool result to grab taskId
        for (const step of steps)
          for (const part of step.content) {
            if (part.type === "tool-result" && part.toolName === "startResearch") {
              writer.write({ type: "data-task", data: part.output });
            }
          }
      },
    });
    writer.merge(result.toUIMessageStream({ sendReasoning: true }));
  },
});
return createUIMessageStreamResponse({ stream });
```

```tsx
// frontend — render loop
{
  message.parts.map((part, i) => {
    if (part.type === "text") return <Markdown key={i}>{part.text}</Markdown>;
    if (part.type === "data-task") return <TaskStream key={i} taskId={part.data.taskId} />;
    return null;
  });
}
```

### SSE endpoint pattern (Hono)

```ts
import { streamSSE } from "hono/streaming";

app.get("/tasks/:id/events", (c) => {
  const taskId = c.req.param("id");
  return streamSSE(c, async (stream) => {
    // 1. replay any past events from DB
    for (const ev of await db.select().from(taskEvents).where(eq(taskEvents.taskId, taskId))) {
      await stream.writeSSE({
        event: ev.type,
        data: JSON.stringify(ev.payload),
      });
    }
    // 2. subscribe to live events
    const emitter = registry.get(taskId)?.emitter;
    if (!emitter) return;
    const handler = async (ev: TaskEvent) => {
      await stream.writeSSE({
        event: ev.type,
        data: JSON.stringify(ev.payload),
      });
    };
    emitter.on("event", handler);
    // 3. heartbeat + cleanup on disconnect
    const beat = setInterval(() => stream.writeSSE({ event: "ping", data: "" }), 15_000);
    stream.onAbort(() => {
      clearInterval(beat);
      emitter.off("event", handler);
    });
    // keep alive
    await new Promise(() => {});
  });
});
```

### The ledger

```ts
type LedgerEntry = {
  taskId?: string;
  label: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  costUsd: number;
  at: Date;
};

// records into PGlite + emits "ledger-update" on the task's emitter so the
// TokenMeter in the chat updates in real time
```

### Hono RPC client typing

```ts
// server
const adminRoutes = new Hono()
  .get("/tasks", async (c) => c.json(await db.select().from(tasks)))
  .get("/tasks/:id", async (c) => c.json(await loadTask(c.req.param("id"))));

export type AdminRoutes = typeof adminRoutes;

// client
import { hc } from "hono/client";
const rpc = hc<AdminRoutes>("/admin");
const res = await rpc.tasks.$get(); // fully typed
```

### Gotchas worth knowing

Small set of things that cost time if you hit them blind:

- **Iterate `step.content[]`, not `step.toolCalls[]` / `step.toolResults[]`.** The top-level arrays on `step` are unreliable across providers in v6. Walk `step.content` and filter by part type (`tool-call`, `tool-result`, `text`, `reasoning`). You'll see this when extracting the `taskId` in `onFinish`.
- **Concurrency control for Stage 2.** You'll fan out ~9 parallel calls. Straight `Promise.all` is fine with most providers at this volume, but if you hit 429s, a tiny limiter (`p-limit`, or just a hand-rolled semaphore) beats retry-spam.
- **`AbortSignal` support.** Every AI SDK call takes an `abortSignal`. Wire one up per task so "user cancels" or "budget exceeded" can cut in-flight LLM calls cleanly instead of waiting them out. The `Promise.race` timeout you add in step 7 is a crude version of this — `abortSignal` is the real one.
- **Structured output retries are automatic.** If the model produces JSON that fails your Zod schema, the SDK re-prompts up to `maxRetries` times before throwing. You generally want to let it — but be aware your `.describe()` text is your lever for reducing those retries.

---

## 7. Stretch goals

**These are entirely optional.** Don't attempt them unless the core flow in §8 is green and you still have hours left in your 8-hour cap (or you're just curious and want to explore further on your own time). Skipping both is a completely valid outcome.

- **Reasoning UI.** When a call uses `providerOptions` reasoning, render the reasoning parts in a collapsed `<details>` under the stage output.
- **Task replay.** Admin "Re-run" button takes an old task, optionally overrides a model, and runs the same pipeline — stores alongside the original for A/B comparison.

---

## 8. Acceptance criteria

Tick all of these and you're done.

- [ ] Chat reply appears in <1s even for heavy questions.
- [ ] The same assistant message visibly gains sections as stages complete.
- [ ] The token + cost widget updates on every LLM call.
- [ ] User can send a second chat message while the first task is still running. Both progress independently.
- [ ] `/admin` lists all tasks with status, cost, and duration. Clicking opens a drawer with every LLM call logged individually.
- [ ] Zero model ID strings inlined outside your central `LLM_MODELS` module.
- [ ] Every AI SDK call is wrapped by `withUsage`.
- [ ] At least two providers used across the pipeline.
- [ ] At least one call uses `providerOptions` for reasoning/thinking.
- [ ] Four distinct Zod schemas transform the data through the pipeline.
- [ ] Every Zod field has `.describe()` populated.
- [ ] A `createFallbackModel` catches a simulated primary-model outage.
- [ ] The cost math on the dashboard matches your hand-calculated total to within a cent on a sample task.

When you can demo all of these live, write up a short reflection (~½ page) on what surprised you, what the SDK abstracts cleanly, and what you had to build around it. Share that in your next 1:1 — it's the actual deliverable.

---

## 9. Helpful reading order

While building, when you get stuck, read in this order:

1. The `ai` package README on the Vercel AI SDK docs site.
2. `@ai-sdk/react` `useChat` reference — specifically the custom `data-*` parts section.
3. The `streamText` / `generateText` / `Output.object()` function references — bookmark each.
4. Hono SSE docs (`hono/streaming`) — `streamSSE` is a two-minute read.
5. Drizzle PGlite docs for the startup `push` pattern.
6. Context7 is available for pulling up-to-date library docs inline — prefer it over web search for anything SDK-specific.

Research however works best for you — reference docs, tutorials, Claude, ChatGPT, Context7, whatever. What matters is that by the end you understand the fundamentals well enough to explain them (the SDK primitives, the async scheduler + streaming bridge, the token ledger). How you get there is your call.

---

Good luck. This is a practice project — no PR, no repo hosting required. When you're done (or when your 8 hours are up), zip the project directory and send it over. Then either walk us through the `TaskStream` component live, or send a short screen recording — whichever is easier for you. That component is the piece that ties every concept in the SDK together, and it's the part we'll want to discuss.

Before zipping, add a **cleanup script** to `package.json` and run it so the zip doesn't ship `node_modules`, build artifacts, or the local PGlite data directory. Figure out what needs to go based on whatever tooling and stack you ended up using. The zip should be just source + config + a short `README` / `.env.example` — small enough to email. Also double-check you didn't include a real `.env` with API keys.
