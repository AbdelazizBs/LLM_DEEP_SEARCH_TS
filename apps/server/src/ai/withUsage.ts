import type { LanguageModelUsage } from "ai";
import { LLM_MODELS, type ModelRole } from "../config/models";
import { recordUsage } from "./ledger";

type UsageResult = {
  usage?: LanguageModelUsage;
};

export async function withUsage<T extends UsageResult>(
  meta: { taskId?: string; label: string; role: ModelRole },
  fn: () => Promise<T>,
) {
  const result = await fn();
  recordUsage(
    {
      taskId: meta.taskId,
      label: meta.label,
      model: LLM_MODELS[meta.role],
    },
    result.usage,
  );
  return result;
}
