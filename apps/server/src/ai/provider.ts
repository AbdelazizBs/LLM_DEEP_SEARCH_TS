import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "../config/env";

export const openrouter = createOpenRouter({
  apiKey: env.openRouterApiKey,
  baseURL: env.openRouterBaseUrl,
});
