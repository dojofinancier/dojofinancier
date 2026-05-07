export type IncidentTriageInput = {
  source: string;
  severity?: "low" | "medium" | "high" | "critical";
  title?: string;
  message: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

export type IncidentTriageResult = {
  plain_language_summary: string;
  severity_assessment: string;
  likely_causes: string[];
  recommended_actions: string[];
  rollback_or_mitigation: string;
  technical_notes: string;
  confidence: "low" | "medium" | "high";
};

const SYSTEM = `You are a production incident assistant for a French-Canadian edtech web app (Le Dojo Financier) hosted on Netlify with Next.js, Prisma/Postgres (Supabase), Stripe, and Supabase Auth.

You receive incident signals from uptime monitors, Sentry, Netlify, DNS checks, or internal tools — not only application errors.

Respond with a single JSON object (no markdown) using exactly these keys:
- plain_language_summary: string (1–3 short sentences in clear French for a non-technical owner)
- severity_assessment: string (one of: low, medium, high, critical — explain briefly why)
- likely_causes: string[] (2–5 items, technical but concise)
- recommended_actions: string[] (numbered priority order, actionable)
- rollback_or_mitigation: string (when to rollback a Netlify deploy, or what to check first if DNS/SSL)
- technical_notes: string (brief, for a developer)
- confidence: string, one of low | medium | high

If information is missing, say what you need; do not invent deploy IDs or logs.`;

export async function triageIncidentWithOpenAI(
  input: IncidentTriageInput,
  apiKey: string
): Promise<IncidentTriageResult> {
  const model = process.env.OPENAI_INCIDENT_MODEL?.trim() || "gpt-5.4";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            incident: input,
            hints: {
              site: "https://dojofinancier.com",
              netlify_branch_url_pattern: "https://main--dojofinancier.netlify.app",
            },
          }),
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned empty content");
  }

  const parsed = JSON.parse(raw) as IncidentTriageResult;
  if (
    typeof parsed.plain_language_summary !== "string" ||
    typeof parsed.technical_notes !== "string"
  ) {
    throw new Error("OpenAI JSON missing required fields");
  }
  return parsed;
}
