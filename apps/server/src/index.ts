import { Scalar } from "@scalar/hono-api-reference";
import { desc } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { env, providerStatus } from "./config/env";
import { checkDatabase, db, initializeDatabase } from "./db/client";
import { tasks } from "./db/schema";

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

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Deep Dive Research Agent API",
    version: "0.1.0",
    description: "Chat, background research tasks, task events, and admin telemetry.",
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "Server is running",
          },
        },
      },
    },
    "/chat": {
      post: {
        summary: "Start or continue a chat turn",
        responses: {
          "200": {
            description: "AI SDK UI message stream",
          },
        },
      },
    },
    "/tasks/{id}/events": {
      get: {
        summary: "Stream task progress events",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Server-sent task events",
          },
        },
      },
    },
    "/admin/tasks": {
      get: {
        summary: "List all research tasks",
        responses: {
          "200": {
            description: "Task list with telemetry summary",
          },
        },
      },
    },
  },
};

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

app.post("/chat", (c) =>
  c.json(
    {
      message: "Chat streaming will be implemented after the pipeline and scheduler are in place.",
    },
    501,
  ),
);

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

export default {
  port: env.port,
  fetch: app.fetch,
};
