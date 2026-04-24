"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { classifyResponse } from "@/lib/ai/accompagnement";
import { sendMakeWebhook } from "@/lib/webhooks/make";
import type { CheckInAnswerSource } from "@prisma/client";

const answerSchema = z.object({
  answerId: z.string().uuid(),
  source: z.enum(["MCQ", "OEQ"]),
  value: z.string().max(4000),
});

const submitSchema = z.object({
  token: z.string().min(10),
  answers: z.array(answerSchema).min(0),
  yesNoReply: z.boolean().optional(),
});

export interface SubmitResult {
  success: boolean;
  error?: string;
  summary?: {
    score: number | null;
    responseRate: number;
    perQuestion: Array<{
      answerId: string;
      source: CheckInAnswerSource;
      isCorrect: boolean | null;
      correctAnswer?: string;
      explanation?: string;
      feedback?: string;
      modelAnswerSnippet?: string;
    }>;
  };
}

/**
 * Handles no-login check-in submissions.
 *
 * - Validates the token maps to a non-expired, non-responded DailyCheckIn.
 * - Grades MCQs synchronously against adaptive_mcq.correct_answer.
 * - Classifies OEQs via AI against adaptive_oeq.model_answer.
 * - Writes CheckInAnswer rows (updates existing placeholders created at send time).
 * - Computes score + response rate, persists CheckInResponse.
 * - Emits WeakAreaSignal rows for each wrong MCQ.
 * - Marks the DailyCheckIn RESPONDED.
 */
export async function submitCheckInAction(
  input: unknown
): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid payload" };
  }
  const { token, answers, yesNoReply } = parsed.data;

  const checkIn = await prisma.dailyCheckIn.findUnique({
    where: { token },
    include: {
      answers: true,
      response: true,
      enrollment: {
        select: {
          id: true,
          product: { select: { aiModel: true } },
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!checkIn) {
    return { success: false, error: "Lien invalide ou expiré." };
  }
  if (checkIn.status === "RESPONDED" || checkIn.response) {
    return { success: false, error: "Ce suivi quotidien a déjà été complété." };
  }
  if (isExpired(checkIn.scheduledFor)) {
    return { success: false, error: "Ce lien a expiré." };
  }

  const answersById = new Map(checkIn.answers.map((a) => [a.id, a]));

  // 1. Load the adaptive rows needed for grading in a single pass
  const mcqIds = checkIn.answers
    .filter((a) => a.source === "MCQ")
    .map((a) => a.adaptiveQuestionId);
  const oeqIds = checkIn.answers
    .filter((a) => a.source === "OEQ")
    .map((a) => a.adaptiveQuestionId);

  const [mcqs, oeqs] = await Promise.all([
    mcqIds.length > 0
      ? prisma.adaptiveMcq.findMany({
          where: { id: { in: mcqIds } },
          select: {
            id: true,
            correctAnswer: true,
            explanation: true,
          },
        })
      : Promise.resolve([]),
    oeqIds.length > 0
      ? prisma.adaptiveOeq.findMany({
          where: { id: { in: oeqIds } },
          select: {
            id: true,
            questionText: true,
            modelAnswer: true,
            explanation: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const mcqById = new Map(mcqs.map((m) => [m.id, m]));
  const oeqById = new Map(oeqs.map((o) => [o.id, o]));

  // 2. Grade each submitted answer
  const perQuestion: NonNullable<SubmitResult["summary"]>["perQuestion"] = [];
  let mcqAsked = 0;
  let mcqAnswered = 0;
  let mcqCorrect = 0;
  const weakSignals: Array<{ chapter: number; topic: string }> = [];

  const answerUpdates: Array<Promise<unknown>> = [];

  // For MCQs: we always count total asked from the placeholder rows.
  for (const placeholder of checkIn.answers) {
    if (placeholder.source === "MCQ") mcqAsked++;
  }

  for (const submitted of answers) {
    const placeholder = answersById.get(submitted.answerId);
    if (!placeholder) continue; // ignore unknown ids

    if (placeholder.source === "MCQ") {
      mcqAnswered++;
      const adaptive = mcqById.get(placeholder.adaptiveQuestionId);
      const studentLetter = submitted.value.trim().toUpperCase();
      const correctLetter = (adaptive?.correctAnswer || "").trim().toUpperCase();
      const isCorrect =
        adaptive != null && studentLetter.length > 0 && studentLetter === correctLetter;
      if (isCorrect) mcqCorrect++;
      else if (adaptive) {
        weakSignals.push({
          chapter: placeholder.adaptiveChapter,
          topic: placeholder.adaptiveTopic,
        });
      }

      answerUpdates.push(
        prisma.checkInAnswer.update({
          where: { id: placeholder.id },
          data: {
            studentAnswer: submitted.value,
            isCorrect,
          },
        })
      );

      perQuestion.push({
        answerId: placeholder.id,
        source: "MCQ",
        isCorrect,
        correctAnswer: adaptive?.correctAnswer,
        explanation: adaptive?.explanation,
      });
    } else if (placeholder.source === "OEQ") {
      const adaptive = oeqById.get(placeholder.adaptiveQuestionId);
      let classification: Awaited<ReturnType<typeof classifyResponse>> | null = null;
      if (adaptive) {
        classification = await classifyResponse(
          {
            questionText: adaptive.questionText,
            modelAnswer: adaptive.modelAnswer,
            studentAnswer: submitted.value,
          },
          checkIn.enrollment.product.aiModel
        );
      }

      answerUpdates.push(
        prisma.checkInAnswer.update({
          where: { id: placeholder.id },
          data: {
            studentAnswer: submitted.value,
            isCorrect:
              classification?.label === "correct"
                ? true
                : classification?.label === "incorrect"
                  ? false
                  : null,
            aiClassification: classification
              ? (classification as unknown as object)
              : undefined,
          },
        })
      );

      perQuestion.push({
        answerId: placeholder.id,
        source: "OEQ",
        isCorrect:
          classification?.label === "correct"
            ? true
            : classification?.label === "incorrect"
              ? false
              : null,
        feedback: classification?.feedback,
        modelAnswerSnippet: adaptive?.modelAnswer?.slice(0, 240),
      });
    }
  }

  await Promise.all(answerUpdates);

  // 3. Compute score + response rate
  const mcqScore = mcqAsked > 0 ? Math.round((mcqCorrect / mcqAsked) * 100) : null;
  const totalAsked = checkIn.answers.length;
  const totalAnswered = answers.length;
  const responseRate =
    totalAsked > 0 ? Math.round((totalAnswered / totalAsked) * 100) : 100;

  // 4. Persist response + mark RESPONDED + emit weak signals
  await prisma.$transaction([
    prisma.checkInResponse.create({
      data: {
        dailyCheckInId: checkIn.id,
        score: mcqScore,
        responseRate,
        yesNoReply: typeof yesNoReply === "boolean" ? yesNoReply : null,
      },
    }),
    prisma.dailyCheckIn.update({
      where: { id: checkIn.id },
      data: { status: "RESPONDED" },
    }),
    ...(weakSignals.length > 0
      ? [
          prisma.weakAreaSignal.createMany({
            data: weakSignals.map((w) => ({
              enrollmentId: checkIn.enrollment.id,
              chapter: w.chapter,
              topic: w.topic,
              signalType: "WRONG_ANSWER" as const,
            })),
          }),
        ]
      : []),
  ]);

  // 5. Fire Make webhook (non-blocking)
  sendMakeWebhook("checkin.response.received" as any, {
    daily_check_in_id: checkIn.id,
    enrollment_id: checkIn.enrollment.id,
    student_email: checkIn.enrollment.user.email,
    type: checkIn.type,
    score: mcqScore,
    response_rate: responseRate,
    responded_at: new Date().toISOString(),
  }).catch(() => {});

  return {
    success: true,
    summary: {
      score: mcqScore,
      responseRate,
      perQuestion,
    },
  };
}

function isExpired(scheduledFor: Date): boolean {
  const expiryMs = 14 * 24 * 60 * 60 * 1000;
  return Date.now() - scheduledFor.getTime() > expiryMs;
}
