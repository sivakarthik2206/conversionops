import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GOOGLE_CLOUD_PROJECT: z.string().default("conversionops-prod"),
  GOOGLE_CLOUD_REGION: z.string().default("us-central1"),
  VERTEX_AI_MODEL: z.string().default("gemini-1.5-flash-001"),
  PORT: z.string().default("3001").transform(Number),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
