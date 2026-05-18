import type { LanguageModelUsage } from "ai";
import { LLM_MODELS, type ModelRole } from "../config/models";
import { recordUsage } from "./ledger";

type UsageResult = {
  usage?: LanguageModelUsage;
};

export async function withUsage<T extends UsageResult>(
  meta: { taskId?: string; label: string; role: ModelRole; onUsage?: (entry: ReturnType<typeof recordUsage>) => void | Promise<void> },
  fn: () => Promise<T>,
) {
  const result = await fn();
  const entry = recordUsage(
    {
      taskId: meta.taskId,
      label: meta.label,
      model: LLM_MODELS[meta.role],
    },
    result.usage,
  );
  await meta.onUsage?.(entry);
  return result;
}
