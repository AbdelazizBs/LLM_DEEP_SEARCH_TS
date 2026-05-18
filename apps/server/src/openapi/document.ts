export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Deep Dive Research Agent API",
    version: "0.1.0",
    description:
      "API for chat-triggered background research tasks, live task events, admin telemetry, and API health checks.",
  },
  tags: [
    {
      name: "System",
      description: "Runtime health and configuration visibility.",
    },
    {
      name: "Chat",
      description: "AI SDK chat entrypoint.",
    },
    {
      name: "Tasks",
      description: "Background research task streams.",
    },
    {
      name: "Admin",
      description: "Task history, event logs, and LLM call telemetry.",
    },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        description: "Checks API runtime, database connectivity, and provider key presence without exposing secrets.",
        responses: {
          "200": {
            description: "Server health state",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/chat": {
      post: {
        tags: ["Chat"],
        summary: "Start a background research task",
        description:
          "Creates a persisted research task, starts the background pipeline, and returns the task ID for SSE subscription.",
        responses: {
          "200": {
            description: "Task started",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatResponse" },
              },
            },
          },
        },
      },
    },
    "/tasks/{id}/events": {
      get: {
        tags: ["Tasks"],
        summary: "Stream task progress events",
        description:
          "Server-sent events endpoint for task status, stage updates, and ledger updates. Currently emits a placeholder status event.",
        parameters: [{ $ref: "#/components/parameters/TaskId" }],
        responses: {
          "200": {
            description: "Server-sent task events",
            content: {
              "text/event-stream": {
                schema: {
                  type: "string",
                  description: "SSE stream containing task event payloads.",
                },
              },
            },
          },
        },
      },
    },
    "/admin/tasks": {
      get: {
        tags: ["Admin"],
        summary: "List all research tasks",
        description: "Returns persisted research task rows ordered by creation time descending.",
        responses: {
          "200": {
            description: "Task list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskListResponse" },
              },
            },
          },
        },
      },
    },
    "/admin/tasks/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get task detail",
        description: "Returns one task with its persisted events and LLM call telemetry.",
        parameters: [{ $ref: "#/components/parameters/TaskId" }],
        responses: {
          "200": {
            description: "Task detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskDetailResponse" },
              },
            },
          },
          "404": {
            description: "Task was not found",
          },
        },
      },
    },
  },
  components: {
    parameters: {
      TaskId: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
    },
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["ok", "database", "providers", "service"],
        properties: {
          ok: { type: "boolean" },
          database: { type: "boolean" },
          service: { type: "string" },
          providers: {
            type: "object",
            required: ["active", "openrouter", "openai", "anthropic", "google"],
            properties: {
              active: { type: "string", enum: ["openrouter", "openai", "anthropic", "google"] },
              openrouter: { type: "boolean" },
              openai: { type: "boolean" },
              anthropic: { type: "boolean" },
              google: { type: "boolean" },
            },
          },
        },
      },
      ChatResponse: {
        type: "object",
        required: ["reply", "mode", "taskId"],
        properties: {
          reply: { type: "string" },
          mode: { type: "string", enum: ["task", "streaming"] },
          taskId: { type: "string" },
        },
      },
      Task: {
        type: "object",
        required: ["id", "question", "status", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          status: { type: "string" },
          finalOutput: { type: ["object", "null"] },
          error: { type: ["string", "null"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          startedAt: { type: ["string", "null"], format: "date-time" },
          completedAt: { type: ["string", "null"], format: "date-time" },
        },
      },
      TaskEvent: {
        type: "object",
        required: ["id", "taskId", "type", "payload", "createdAt"],
        properties: {
          id: { type: "string" },
          taskId: { type: "string" },
          type: { type: "string" },
          payload: { type: "object" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      LlmCall: {
        type: "object",
        required: [
          "id",
          "label",
          "model",
          "inputTokens",
          "outputTokens",
          "reasoningTokens",
          "costUsd",
          "createdAt",
        ],
        properties: {
          id: { type: "string" },
          taskId: { type: ["string", "null"] },
          label: { type: "string" },
          model: { type: "string" },
          inputTokens: { type: "integer" },
          outputTokens: { type: "integer" },
          reasoningTokens: { type: "integer" },
          costUsd: { type: "number" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TaskListResponse: {
        type: "object",
        required: ["tasks"],
        properties: {
          tasks: {
            type: "array",
            items: { $ref: "#/components/schemas/Task" },
          },
        },
      },
      TaskDetailResponse: {
        type: "object",
        required: ["task", "events", "llmCalls"],
        properties: {
          task: { $ref: "#/components/schemas/Task" },
          events: {
            type: "array",
            items: { $ref: "#/components/schemas/TaskEvent" },
          },
          llmCalls: {
            type: "array",
            items: { $ref: "#/components/schemas/LlmCall" },
          },
        },
      },
    },
  },
} as const;
