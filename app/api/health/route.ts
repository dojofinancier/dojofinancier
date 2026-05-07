import { NextRequest, NextResponse } from "next/server";
import {
  aggregateChecks,
  checkCriticalPublicAssets,
  checkDatabase,
  checkRequiredEnv,
  getDeploymentMeta,
} from "@/lib/observability/health";
import { verifyBearerSecret } from "@/lib/security/request-secrets";

/**
 * Lightweight liveness: `/api/health` — no DB, safe for frequent uptime checks.
 *
 * Full probes: `GET /api/health?full=1` with `Authorization: Bearer <HEALTH_CHECK_SECRET>`
 * Returns 503 if any dependency check fails.
 */
export async function GET(request: NextRequest) {
  const deployment = getDeploymentMeta();
  const stamp = new Date().toISOString();
  const full =
    request.nextUrl.searchParams.get("full") === "1" ||
    request.nextUrl.searchParams.get("deep") === "1";

  if (!full) {
    return NextResponse.json({
      status: "ok",
      service: "dojo-financier-app",
      timestamp: stamp,
      deployment,
    });
  }

  const secret = process.env.HEALTH_CHECK_SECRET;
  if (!verifyBearerSecret(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const envChecks = checkRequiredEnv();
  const assetChecks = checkCriticalPublicAssets();
  const database = await checkDatabase();

  const checks = {
    ...envChecks,
    ...assetChecks,
    database,
  };

  const { status, failed } = aggregateChecks(checks);
  const httpStatus = status === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status,
      failed,
      timestamp: stamp,
      deployment,
      checks,
    },
    { status: httpStatus }
  );
}
