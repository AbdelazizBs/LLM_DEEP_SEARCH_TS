export const LLM_MODELS = {
  chat: "groq/openai/gpt-oss-20b",
  decompose: "groq/openai/gpt-oss-20b",
  angles: "groq/openai/gpt-oss-20b",
  findings: "groq/openai/gpt-oss-20b",
  scoring: "groq/openai/gpt-oss-20b",
  synthesize: "groq/openai/gpt-oss-20b",
  fallback: "groq/openai/gpt-oss-20b",
} as const;

export type ModelRole = keyof typeof LLM_MODELS;
export type ModelId = (typeof LLM_MODELS)[ModelRole];

export const MODEL_PRICING_USD_PER_1M_TOKENS: Record<ModelId, { input: number; output: number; reasoning?: number }> = {
  "groq/openai/gpt-oss-20b": { input: 0, output: 0, reasoning: 0 },
};
