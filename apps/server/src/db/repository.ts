import { asc, desc, eq } from "drizzle-orm";
import type { FinalReport, TaskStatus } from "@deep-research/shared";
import type { LedgerEntry } from "../ai/ledger";
import type { PipelineEvent } from "../ai/types";
import { db } from "./client";
import { llmCalls, taskEvents, tasks } from "./schema";

export async function createTask(question: string) {
  const task = {
    id: crypto.randomUUID(),
    question,
    status: "scheduled" satisfies TaskStatus,
  };

  await db.insert(tasks).values(task);
  return task;
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  extra: { finalOutput?: FinalReport; error?: string } = {},
) {
  await db
    .update(tasks)
    .set({
      status,
      finalOutput: extra.finalOutput,
      error: extra.error,
      updatedAt: new Date(),
      startedAt: status === "running" ? new Date() : undefined,
      completedAt: status === "completed" || status === "failed" ? new Date() : undefined,
    })
    .where(eq(tasks.id, taskId));
}

export async function createTaskEvent(taskId: string, event: PipelineEvent) {
  const row = {
    id: crypto.randomUUID(),
    taskId,
    type: event.type,
    payload: JSON.parse(JSON.stringify(event)) as PipelineEvent,
  };

  await db.insert(taskEvents).values(row);
  return row;
}

export async function createLlmCall(entry: LedgerEntry) {
  const row = {
    id: crypto.randomUUID(),
    taskId: entry.taskId,
    label: entry.label,
    model: entry.model,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    reasoningTokens: entry.reasoningTokens,
    costUsd: entry.costUsd,
    createdAt: entry.at,
  };

  await db.insert(llmCalls).values(row);
  return row;
}

export async function listTasks() {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function getTaskDetail(taskId: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

  if (!task) return null;

  const [events, calls] = await Promise.all([
    db.select().from(taskEvents).where(eq(taskEvents.taskId, taskId)).orderBy(asc(taskEvents.createdAt)),
    db.select().from(llmCalls).where(eq(llmCalls.taskId, taskId)).orderBy(asc(llmCalls.createdAt)),
  ]);

  return {
    task,
    events,
    llmCalls: calls,
  };
}
