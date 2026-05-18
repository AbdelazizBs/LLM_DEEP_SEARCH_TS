import { chatRequestSchema } from "@deep-research/shared";
import { Scalar } from "@scalar/hono-api-reference";
import { asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { env, providerStatus } from "./config/env";
import { checkDatabase, db, initializeDatabase } from "./db/client";
import { llmCalls, taskEvents, tasks } from "./db/schema";
import { openApiDocument } from "./openapi/document";

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

  return c.json({
    mode: "stub",
    reply:
      "Chat is connected to the API. The next phase will replace this acknowledgement with the streaming research task.",
  });
});

app.get("/tasks/:id/events", (c) => {
  const taskId = c.req.param("id");

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: "status",
      data: JSON.stringify({
        taskId,
        status: "not_implemented",
      }),
    });
  });
});

app.get("/admin/tasks", async (c) => {
  const rows = await db.select().from(tasks).orderBy(desc(tasks.createdAt));

  return c.json({ tasks: rows });
});

app.get("/admin/tasks/:id", async (c) => {
  const taskId = c.req.param("id");
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

  if (!task) {
    return c.json({ message: "Task not found" }, 404);
  }

  const [events, calls] = await Promise.all([
    db.select().from(taskEvents).where(eq(taskEvents.taskId, taskId)).orderBy(asc(taskEvents.createdAt)),
    db.select().from(llmCalls).where(eq(llmCalls.taskId, taskId)).orderBy(asc(llmCalls.createdAt)),
  ]);

  return c.json({
    task,
    events,
    llmCalls: calls,
  });
});

export default {
  port: env.port,
  fetch: app.fetch,
};
