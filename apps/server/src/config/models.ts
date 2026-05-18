export const LLM_MODELS = {
  chat: "openai/gpt-4o-mini",
  decompose: "openai/gpt-4o-mini",
  angles: "google/gemini-2.0-flash-001",
  findings: "openai/gpt-4o-mini",
  scoring: "google/gemini-2.0-flash-001",
  synthesize: "anthropic/claude-3.5-sonnet",
  fallback: "openai/gpt-4o-mini",
} as const;

export type ModelRole = keyof typeof LLM_MODELS;
export type ModelId = (typeof LLM_MODELS)[ModelRole];

export const MODEL_PRICING_USD_PER_1M_TOKENS: Record<ModelId, { input: number; output: number; reasoning?: number }> = {
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "google/gemini-2.0-flash-001": { input: 0.1, output: 0.4 },
  "anthropic/claude-3.5-sonnet": { input: 3, output: 15 },
};
