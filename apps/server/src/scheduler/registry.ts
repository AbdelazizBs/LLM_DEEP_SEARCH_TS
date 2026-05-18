import { EventEmitter } from "node:events";
import type { PipelineEvent } from "../ai/types";
import { runResearchPipeline } from "../ai/pipeline";
import { createLlmCall, createTaskEvent, updateTaskStatus } from "../db/repository";

type TaskRuntime = {
  emitter: EventEmitter;
};

const registry = new Map<string, TaskRuntime>();

export function ensureTaskRuntime(taskId: string) {
  const existing = registry.get(taskId);
  if (existing) return existing;

  const runtime = {
    emitter: new EventEmitter(),
  };

  registry.set(taskId, runtime);
  return runtime;
}

export function getTaskRuntime(taskId: string) {
  return registry.get(taskId);
}

export function startResearchTask(taskId: string, question: string) {
  const runtime = ensureTaskRuntime(taskId);

  queueMicrotask(async () => {
    try {
      await updateTaskStatus(taskId, "running");

      const result = await runResearchPipeline(
        question,
        async (event) => {
          if (event.type === "ledger") {
            await createLlmCall(event.entry);
          }

          await publishTaskEvent(taskId, event);
        },
        { taskId },
      );

      await updateTaskStatus(taskId, "completed", {
        finalOutput: result.report,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown task failure";

      await updateTaskStatus(taskId, "failed", {
        error: message,
      });

      await publishTaskEvent(taskId, {
        type: "task-error",
        message,
      });
    }
  });

  return runtime;
}

async function publishTaskEvent(taskId: string, event: PipelineEvent) {
  const runtime = ensureTaskRuntime(taskId);
  const row = await createTaskEvent(taskId, event);
  runtime.emitter.emit("event", {
    type: row.type,
    payload: row.payload,
  });
}
