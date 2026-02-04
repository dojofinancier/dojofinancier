"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth/require-auth";
import { z } from "zod";
import { logServerError } from "@/lib/utils/error-logging";

const submitQuizSchema = z.object({
  quizId: z.string(),
  answers: z.record(z.string(), z.string()), // { questionId: answer }
  timeSpent: z.number().optional(),
});

const recalcQuizAttemptsSchema = z.object({
  quizId: z.string(),
});

export type QuizActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

const getOrderedOptionKeys = (options: Record<string, string>) => {
  const optionKeys = Object.keys(options || {});
  return optionKeys.slice().sort((a, b) => {
    const aNum = Number.parseInt(a.replace(/\D/g, ""), 10);
    const bNum = Number.parseInt(b.replace(/\D/g, ""), 10);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return aNum - bNum;
    return a.localeCompare(b);
  });
};

const resolveAnswerIndex = (answer: string | undefined, options: Record<string, string>) => {
  if (!answer) return null;
  const trimmed = answer.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const orderedKeys = getOrderedOptionKeys(options);

  const directKey = orderedKeys.find((key) => key.toLowerCase() === lower);
  if (directKey) return orderedKeys.indexOf(directKey);

  const valueMatchKey = orderedKeys.find((key) => {
    const value = options[key];
    return value && value.trim().toLowerCase() === lower;
  });
  if (valueMatchKey) return orderedKeys.indexOf(valueMatchKey);

  const letterMatch = lower.match(/^([a-d])\s*[\).:\-]?/);
  if (letterMatch) {
    const idx = ["a", "b", "c", "d"].indexOf(letterMatch[1]);
    if (idx >= 0 && idx < orderedKeys.length) return idx;
  }

  const numberMatch = lower.match(/^([1-4])\s*[\).:\-]?/);
  if (numberMatch) {
    const idx = Number.parseInt(numberMatch[1], 10) - 1;
    if (idx >= 0 && idx < orderedKeys.length) return idx;
  }

  const optionMatch = lower.match(/^option\s*([1-9]\d*)/);
  if (optionMatch) {
    const idx = Number.parseInt(optionMatch[1], 10) - 1;
    if (idx >= 0 && idx < orderedKeys.length) return idx;
  }

  return null;
};

/**
 * Submit a quiz attempt
 */
export async function submitQuizAttemptAction(
  data: z.infer<typeof submitQuizSchema>
): Promise<QuizActionResult> {
  try {
    const user = await requireAuth();
    const validatedData = submitQuizSchema.parse(data);

    // Get quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: validatedData.quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz) {
      return {
        success: false,
        error: "Quiz introuvable",
      };
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;

    quiz.questions.forEach((question) => {
      const options = (question.options as Record<string, string>) || {};
      const userIndex = resolveAnswerIndex(validatedData.answers[question.id], options);
      const correctIndex = resolveAnswerIndex(question.correctAnswer, options);
      if (userIndex !== null && correctIndex !== null && userIndex === correctIndex) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);

    // Create quiz attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: validatedData.quizId,
        score,
        answers: validatedData.answers,
        timeSpent: validatedData.timeSpent,
      },
    });

    // Mark content item as complete if passing score achieved
    if (score >= quiz.passingScore) {
      const contentItem = await prisma.contentItem.findUnique({
        where: { id: quiz.contentItemId },
      });

      if (contentItem) {
        await prisma.progressTracking.upsert({
          where: {
            userId_contentItemId: {
              userId: user.id,
              contentItemId: contentItem.id,
            },
          },
          create: {
            userId: user.id,
            contentItemId: contentItem.id,
            completedAt: new Date(),
            lastAccessedAt: new Date(),
          },
          update: {
            completedAt: new Date(),
            lastAccessedAt: new Date(),
          },
        });
      }
    }

    return {
      success: true,
      data: {
        attempt,
        score,
        passingScore: quiz.passingScore,
        passed: score >= quiz.passingScore,
        correctAnswers,
        totalQuestions,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Données invalides",
      };
    }

    await logServerError({
      errorMessage: `Failed to submit quiz attempt: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de la soumission du quiz",
    };
  }
}

/**
 * Recalculate scores for existing attempts of a quiz
 */
export async function recalcQuizAttemptsAction(
  data: z.infer<typeof recalcQuizAttemptsSchema>
): Promise<QuizActionResult> {
  try {
    await requireAdmin();
    const validatedData = recalcQuizAttemptsSchema.parse(data);

    const quiz = await prisma.quiz.findUnique({
      where: { id: validatedData.quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz) {
      return {
        success: false,
        error: "Quiz introuvable",
      };
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: validatedData.quizId },
      select: {
        id: true,
        score: true,
        answers: true,
      },
    });

    const totalQuestions = quiz.questions.length;
    let updatedCount = 0;

    for (const attempt of attempts) {
      const answers = (attempt.answers as Record<string, string>) || {};
      let correctAnswers = 0;

      quiz.questions.forEach((question) => {
        const options = (question.options as Record<string, string>) || {};
        const userIndex = resolveAnswerIndex(answers[question.id], options);
        const correctIndex = resolveAnswerIndex(question.correctAnswer, options);
        if (userIndex !== null && correctIndex !== null && userIndex === correctIndex) {
          correctAnswers++;
        }
      });

      const score = Math.round((correctAnswers / totalQuestions) * 100);
      if (score !== attempt.score) {
        await prisma.quizAttempt.update({
          where: { id: attempt.id },
          data: { score },
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      data: {
        totalAttempts: attempts.length,
        updatedCount,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Données invalides",
      };
    }

    await logServerError({
      errorMessage: `Failed to recalc quiz attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors du recalcul des tentatives",
    };
  }
}

/**
 * Get quiz attempts for a quiz
 */
export async function getQuizAttemptsAction(quizId: string) {
  try {
    const user = await requireAuth();

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        userId: user.id,
      },
      select: {
        id: true,
        score: true,
        completedAt: true,
        answers: true,
      },
      orderBy: { completedAt: "desc" },
    });

    return attempts;
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get quiz attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return [];
  }
}

