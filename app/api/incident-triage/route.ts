import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { triageIncidentWithOpenAI } from "@/lib/observability/incident-triage-openai";
import { sendIncidentTriageWebhook } from "@/lib/webhooks/make";
import { getDeploymentMeta } from "@/lib/observability/deployment-meta";
import { verifyBearerSecret } from "@/lib/security/request-secrets";

const bodySchema = z.object({
  source: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  title: z.string().optional(),
  message: z.string().min(1),
  url: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

function verifyTriageAuth(request: NextRequest): boolean {
  return verifyBearerSecret(request, process.env.INCIDENT_TRIAGE_SECRET);
}

/**
 * POST /api/incident-triage
 * Auth: Authorization: Bearer <INCIDENT_TRIAGE_SECRET>
 *
 * Call from Make.com, internal tools, or other automation after mapping their payload
 * to { source, message, ... }. (Sentry does not POST here directly unless you add a
 * custom integration that forwards with this Bearer token.) Returns JSON + optional Make forward.
 */
export async function POST(request: NextRequest) {
  if (!verifyTriageAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const deployment = getDeploymentMeta();

  try {
    const triage = await triageIncidentWithOpenAI(
      {
        source: input.source,
        severity: input.severity,
        title: input.title,
        message: input.message,
        url: input.url,
        metadata: input.metadata,
      },
      apiKey
    );

    const envelope = {
      received_at: new Date().toISOString(),
      deployment,
      input,
      triage,
    };

    sendIncidentTriageWebhook(envelope).catch(() => {
      // non-blocking; Make.com failures must not fail triage response
    });

    return NextResponse.json(envelope);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Triage failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
