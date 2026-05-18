import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { env } from "../config/env";
import { LLM_MODELS, type ModelRole } from "../config/models";

globalThis.AI_SDK_LOG_WARNINGS = false;

export const openrouter = createOpenRouter({
  apiKey: env.openRouterApiKey,
  baseURL: env.openRouterBaseUrl,
  compatibility: "strict",
});

export const groq = createGroq({
  apiKey: env.groqApiKey,
});

export function modelFor(role: ModelRole) {
  const modelId = LLM_MODELS[role];

  if (modelId.startsWith("groq/")) {
    return groq(modelId.replace("groq/", ""));
  }

  return openrouter.chat(modelId, {
    usage: {
      include: true,
    },
  });
}
