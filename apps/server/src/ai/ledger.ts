import type { LanguageModelUsage } from "ai";
import { MODEL_PRICING_USD_PER_1M_TOKENS, type ModelId } from "../config/models";

export type LedgerEntry = {
  taskId?: string;
  label: string;
  model: ModelId;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  costUsd: number;
  at: Date;
};

const entries: LedgerEntry[] = [];

export function getLedgerEntries() {
  return entries;
}

export function resetLedger() {
  entries.length = 0;
}

export function recordUsage(meta: { taskId?: string; label: string; model: ModelId }, usage?: LanguageModelUsage) {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const reasoningTokens = usage?.outputTokenDetails?.reasoningTokens ?? usage?.reasoningTokens ?? 0;
  const pricing = MODEL_PRICING_USD_PER_1M_TOKENS[meta.model];
  const costUsd =
    (inputTokens * pricing.input) / 1_000_000 +
    (outputTokens * pricing.output) / 1_000_000 +
    (reasoningTokens * (pricing.reasoning ?? pricing.output)) / 1_000_000;

  const entry: LedgerEntry = {
    ...meta,
    inputTokens,
    outputTokens,
    reasoningTokens,
    costUsd,
    at: new Date(),
  };

  entries.push(entry);
  return entry;
}

export function summarizeLedger() {
  return entries.reduce(
    (summary, entry) => ({
      calls: summary.calls + 1,
      inputTokens: summary.inputTokens + entry.inputTokens,
      outputTokens: summary.outputTokens + entry.outputTokens,
      reasoningTokens: summary.reasoningTokens + entry.reasoningTokens,
      costUsd: summary.costUsd + entry.costUsd,
    }),
    {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      costUsd: 0,
    },
  );
}
