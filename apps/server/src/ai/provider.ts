import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const openrouter = createOpenRouter({
  apiKey: Bun.env.OPENROUTER_API_KEY,
});
