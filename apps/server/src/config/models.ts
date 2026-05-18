export const LLM_MODELS = {
  chat: "openrouter/free",
  decompose: "openrouter/free",
  angles: "openrouter/free",
  findings: "openrouter/free",
  scoring: "openrouter/free",
  synthesize: "openrouter/free",
  fallback: "openrouter/free",
} as const;

export type ModelRole = keyof typeof LLM_MODELS;
export type ModelId = (typeof LLM_MODELS)[ModelRole];

export const MODEL_PRICING_USD_PER_1M_TOKENS: Record<ModelId, { input: number; output: number; reasoning?: number }> = {
  "openrouter/free": { input: 0, output: 0, reasoning: 0 },
};
