import OpenAI from "openai";

let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable.");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

const DEFAULT_MODEL = "gpt-5.4-mini";

// ─── Open-ended classification ───────────────────────────────────────────────

export type OeqLabel = "correct" | "partial" | "incorrect" | "unclear";

export interface ClassifyOeqResult {
  label: OeqLabel;
  feedback: string;
}

export interface ClassifyOeqInput {
  questionText: string;
  modelAnswer: string;
  studentAnswer: string;
}

/**
 * Classifies an open-ended answer against the model answer.
 * Returns a constrained label + a short French feedback sentence.
 * Robust to AI failures: falls back to "unclear" with a safe message.
 */
export async function classifyResponse(
  input: ClassifyOeqInput,
  model: string = DEFAULT_MODEL
): Promise<ClassifyOeqResult> {
  if (!input.studentAnswer || input.studentAnswer.trim().length === 0) {
    return { label: "unclear", feedback: "Aucune réponse fournie." };
  }

  const systemPrompt = `You are a strict but fair grader of French finance-exam open-ended answers.
Classify a student's answer into exactly one of: "correct", "partial", "incorrect", "unclear".
Return JSON ONLY of the shape:
{
  "label": "correct|partial|incorrect|unclear",
  "feedback": "1-2 short sentences, in French, explaining the classification in a supportive tone"
}

Rules:
- "correct": covers all key ideas of the model answer.
- "partial": covers some but not all key ideas, or adds minor errors.
- "incorrect": wrong or misses all key ideas.
- "unclear": student reply too short or ambiguous to judge.
- Feedback must be <= 220 characters, in French, supportive and concrete.
- Never reveal the model answer verbatim.`;

  const userPrompt = `Question: ${input.questionText}

Réponse modèle (référence interne):
${input.modelAnswer}

Réponse de l'étudiant:
"""${input.studentAnswer.trim()}"""

Classify the student's answer.`;

  try {
    const response = await getClient().chat.completions.create({
      model,
      temperature: 0.1,
      max_completion_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content) as {
      label: string;
      feedback: string;
    };
    const label = normalizeLabel(parsed.label);
    const feedback =
      typeof parsed.feedback === "string" && parsed.feedback.trim().length > 0
        ? parsed.feedback.trim().slice(0, 240)
        : defaultFeedback(label);

    return { label, feedback };
  } catch (error) {
    console.error("AI classifyResponse failed:", error);
    return {
      label: "unclear",
      feedback: "Nous n'avons pas pu évaluer votre réponse automatiquement.",
    };
  }
}

function normalizeLabel(value: string): OeqLabel {
  const v = (value || "").toLowerCase().trim();
  if (v === "correct" || v === "partial" || v === "incorrect") return v;
  return "unclear";
}

function defaultFeedback(label: OeqLabel): string {
  switch (label) {
    case "correct":
      return "Bonne réponse, vous avez bien saisi l'essentiel.";
    case "partial":
      return "Bonne piste — il manque quelques éléments clés.";
    case "incorrect":
      return "Ce n'est pas la bonne réponse. Revoyons ensemble ce point.";
    case "unclear":
    default:
      return "Réponse trop courte pour être évaluée.";
  }
}

// ─── Weekly summary ──────────────────────────────────────────────────────────

export interface WeeklySummaryInput {
  studentFirstName: string;
  examDate: Date | null;
  totalCheckIns: number;
  respondedCount: number;
  missedCount: number;
  avgScore: number | null;
  streak: number;
  weekNumber: number;
  weakAreas: Array<{ chapter: number; topic: string; hitCount: number }>;
  coveredTopics: Array<{ chapter: number; topic: string }>;
  plannedChapters: number[];
}

/**
 * Produces a short French weekly summary (markdown) from purely structured
 * performance data. No freeform coaching, no open-ended tutoring.
 */
export async function generateWeeklySummary(
  input: WeeklySummaryInput,
  model: string = DEFAULT_MODEL
): Promise<string> {
  const daysUntilExam = input.examDate
    ? Math.max(
        0,
        Math.ceil(
          (input.examDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )
      )
    : null;

  const systemPrompt = `You write short weekly progress summaries (in French) for finance-exam students.
Output must be valid JSON with a single "markdown" field.

Constraints:
- Markdown only, no HTML.
- Max 180 words.
- Structure:
  ### Résumé
  <2-3 sentences>
  ### Points à renforcer
  - (list weak areas briefly if any)
  ### Focus pour la semaine prochaine
  <1-2 sentences referencing planned chapters>
- Tone: supportive, concrete, no chatbot style.
- Do not invent data not present in the input.`;

  const userPrompt = JSON.stringify(
    {
      studentFirstName: input.studentFirstName,
      daysUntilExam,
      weekNumber: input.weekNumber,
      totalCheckIns: input.totalCheckIns,
      respondedCount: input.respondedCount,
      missedCount: input.missedCount,
      avgScore: input.avgScore,
      streak: input.streak,
      weakAreas: input.weakAreas,
      coveredTopics: input.coveredTopics,
      plannedChapters: input.plannedChapters,
    },
    null,
    2
  );

  try {
    const response = await getClient().chat.completions.create({
      model,
      temperature: 0.4,
      max_completion_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content) as { markdown?: string };
    if (typeof parsed.markdown === "string" && parsed.markdown.trim().length) {
      return parsed.markdown.trim();
    }
    return fallbackSummary(input, daysUntilExam);
  } catch (error) {
    console.error("AI generateWeeklySummary failed:", error);
    return fallbackSummary(input, daysUntilExam);
  }
}

function fallbackSummary(
  input: WeeklySummaryInput,
  daysUntilExam: number | null
): string {
  const lines: string[] = [];
  lines.push("### Résumé");
  const rate =
    input.totalCheckIns > 0
      ? Math.round((input.respondedCount / input.totalCheckIns) * 100)
      : 0;
  lines.push(
    `Cette semaine : ${input.respondedCount}/${input.totalCheckIns} check-ins complétés (${rate}%). Score moyen : ${input.avgScore !== null ? `${input.avgScore}%` : "N/A"}. Série en cours : ${input.streak} jour${input.streak === 1 ? "" : "s"}.`
  );

  if (input.weakAreas.length > 0) {
    lines.push("");
    lines.push("### Points à renforcer");
    for (const w of input.weakAreas.slice(0, 3)) {
      lines.push(`- Chapitre ${w.chapter} — ${w.topic}`);
    }
  }

  lines.push("");
  lines.push("### Focus pour la semaine prochaine");
  if (input.plannedChapters.length > 0) {
    lines.push(
      `Concentrez-vous sur les chapitres ${input.plannedChapters.join(", ")}.${daysUntilExam !== null ? ` Il reste ${daysUntilExam} jour(s) avant l'examen.` : ""}`
    );
  } else {
    lines.push(
      `Maintenez votre rythme.${daysUntilExam !== null ? ` Il reste ${daysUntilExam} jour(s) avant l'examen.` : ""}`
    );
  }

  return lines.join("\n");
}

// ─── Context line selection (deterministic, no AI) ──────────────────────────

import type { ContextLineCategory } from "@prisma/client";

export function pickContextLineCategory(params: {
  isMissedReplacement: boolean;
  daysUntilExam: number | null;
  hasWeakAreas: boolean;
  hasPlan: boolean;
}): ContextLineCategory {
  if (params.isMissedReplacement) return "MISSED_ACK";
  if (params.daysUntilExam !== null && params.daysUntilExam <= 14)
    return "EXAM_URGENCY";
  if (params.hasWeakAreas) return "WEAK_AREA";
  if (params.hasPlan) return "PLAN_REMINDER";
  return "NORMAL";
}
