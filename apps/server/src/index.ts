import { chatRequestSchema } from "@deep-research/shared";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { env, providerStatus } from "./config/env";
import { checkDatabase, initializeDatabase } from "./db/client";
import { createTask, getTaskDetail, listTasks } from "./db/repository";
import { openApiDocument } from "./openapi/document";
import { ensureTaskRuntime, getTaskRuntime, startResearchTask } from "./scheduler/registry";

await initializeDatabase();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.appUrl,
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/health", async (c) =>
  c.json({
    ok: true,
    database: await checkDatabase(),
    providers: providerStatus,
    service: "deep-dive-research-agent",
  }),
);

app.get("/openapi.json", (c) => c.json(openApiDocument));
app.get(
  "/docs",
  Scalar({
    url: "/openapi.json",
    pageTitle: "Deep Dive Research Agent API",
  }),
);

app.post("/chat", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        message: "Invalid chat request.",
        issues: parsed.error.issues,
      },
      400,
    );
  }

  const task = await createTask(parsed.data.message);
  startResearchTask(task.id, parsed.data.message);

  return c.json({
    mode: "task",
    taskId: task.id,
    reply: "",
  });
});

app.get("/tasks/:id/events", (c) => {
  const taskId = c.req.param("id");

  return streamSSE(c, async (stream) => {
    const detail = await getTaskDetail(taskId);

    if (detail) {
      for (const event of detail.events) {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event.payload),
        });
      }
    }

    const runtime = detail ? ensureTaskRuntime(taskId) : getTaskRuntime(taskId);
    if (!runtime) return;

    const handler = async (event: { type: string; payload: unknown }) => {
      await stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event.payload),
      });
    };

    runtime.emitter.on("event", handler);

    const beat = setInterval(() => {
      void stream.writeSSE({ event: "ping", data: "" });
    }, 5_000);

    stream.onAbort(() => {
      clearInterval(beat);
      runtime.emitter.off("event", handler);
    });

    await new Promise(() => undefined);
  });
});

app.get("/admin/tasks", async (c) => {
  const rows = await listTasks();

  return c.json({ tasks: rows });
});

app.get("/admin/tasks/:id", async (c) => {
  const taskId = c.req.param("id");
  const detail = await getTaskDetail(taskId);

  if (!detail) {
    return c.json({ message: "Task not found" }, 404);
  }

  return c.json(detail);
});

export default {
  port: env.port,
  idleTimeout: env.bunIdleTimeoutSeconds,
  fetch: app.fetch,
};
