import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export type CheckStatus = "ok" | "fail";

export function getDeploymentMeta() {
  return {
    commit:
      process.env.NEXT_PUBLIC_GIT_SHA?.trim() ||
      process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
      process.env.COMMIT_REF?.trim() ||
      null,
    deployUrl: process.env.URL?.trim() || process.env.DEPLOY_URL?.trim() || null,
    context: process.env.CONTEXT?.trim() || null,
    nodeEnv: process.env.NODE_ENV,
  };
}

export function checkRequiredEnv(): Record<string, CheckStatus> {
  const flag = (v: string | undefined) => (v && v.trim().length > 0 ? "ok" : ("fail" as const));
  return {
    databaseUrl: flag(process.env.DATABASE_URL),
    supabaseUrl: flag(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: flag(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    stripeSecretKey: flag(process.env.STRIPE_SECRET_KEY),
    openaiApiKey: flag(process.env.OPENAI_API_KEY),
  };
}

export function checkCriticalPublicAssets(): Record<string, CheckStatus> {
  const dir = path.join(process.cwd(), "public");
  const files = ["logo_dark.png", "logo_light.png", "Favicon.ico"];
  const out: Record<string, CheckStatus> = {};
  for (const name of files) {
    out[name] = fs.existsSync(path.join(dir, name)) ? "ok" : "fail";
  }
  return out;
}

export async function checkDatabase(): Promise<CheckStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "fail";
  }
}

export function aggregateChecks(checks: Record<string, CheckStatus>): {
  status: "ok" | "degraded";
  failed: string[];
} {
  const failed = Object.entries(checks)
    .filter(([, v]) => v === "fail")
    .map(([k]) => k);
  return { status: failed.length === 0 ? "ok" : "degraded", failed };
}
