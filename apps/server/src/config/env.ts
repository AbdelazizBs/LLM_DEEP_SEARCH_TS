import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  activeProvider: z.preprocess(
    emptyToUndefined,
    z.enum(["openrouter", "openai", "anthropic", "google"]).default("openrouter"),
  ),
  appUrl: z.preprocess(emptyToUndefined, z.string().url().default("http://localhost:5173")),
  serverUrl: z.preprocess(emptyToUndefined, z.string().url().default("http://localhost:3000")),
  port: z.coerce.number().int().positive().default(3000),
  pgliteDataDir: z.preprocess(emptyToUndefined, z.string().default("./pgdata")),
  openRouterApiKey: z.preprocess(emptyToUndefined, z.string().optional()),
  openRouterBaseUrl: z.preprocess(
    emptyToUndefined,
    z.string().url().default("https://openrouter.ai/api/v1"),
  ),
  openAiApiKey: z.preprocess(emptyToUndefined, z.string().optional()),
  anthropicApiKey: z.preprocess(emptyToUndefined, z.string().optional()),
  googleGenerativeAiApiKey: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const env = envSchema.parse({
  activeProvider: Bun.env.ACTIVE_PROVIDER,
  appUrl: Bun.env.APP_URL,
  serverUrl: Bun.env.SERVER_URL,
  port: Bun.env.PORT,
  pgliteDataDir: Bun.env.PGLITE_DATA_DIR,
  openRouterApiKey: Bun.env.OPENROUTER_API_KEY,
  openRouterBaseUrl: Bun.env.OPENROUTER_BASE_URL,
  openAiApiKey: Bun.env.OPENAI_API_KEY,
  anthropicApiKey: Bun.env.ANTHROPIC_API_KEY,
  googleGenerativeAiApiKey: Bun.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const providerStatus = {
  active: env.activeProvider,
  openrouter: Boolean(env.openRouterApiKey),
  openai: Boolean(env.openAiApiKey),
  anthropic: Boolean(env.anthropicApiKey),
  google: Boolean(env.googleGenerativeAiApiKey),
};
