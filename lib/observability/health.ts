import { Client } from "pg";

export type CheckStatus = "ok" | "fail";

export function checkRequiredEnv(): Record<string, CheckStatus> {
  const flag = (v: string | undefined) =>
    v && v.trim().length > 0 ? "ok" : ("fail" as const);

  return {
    databaseUrl: flag(process.env.DATABASE_URL),
    supabaseUrl: flag(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: flag(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    stripeSecretKey: flag(process.env.STRIPE_SECRET_KEY),
    openaiApiKey: flag(process.env.OPENAI_API_KEY),
  };
}

export async function checkDatabase(): Promise<CheckStatus> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return "fail";

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return "ok";
  } catch {
    return "fail";
  } finally {
    await client.end().catch(() => undefined);
  }
}

export function aggregateChecks(checks: Record<string, CheckStatus>): {
  status: "ok" | "degraded";
  failed: string[];
} {
  const failed = Object.entries(checks)
    .filter(([, value]) => value === "fail")
    .map(([name]) => name);

  return { status: failed.length === 0 ? "ok" : "degraded", failed };
}
