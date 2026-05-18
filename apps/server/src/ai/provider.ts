import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "../config/env";
import { LLM_MODELS, type ModelRole } from "../config/models";

export const openrouter = createOpenRouter({
  apiKey: env.openRouterApiKey,
  baseURL: env.openRouterBaseUrl,
  compatibility: "strict",
});

export function modelFor(role: ModelRole) {
  return openrouter.chat(LLM_MODELS[role], {
    usage: {
      include: true,
    },
  });
}
