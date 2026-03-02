"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { logServerError } from "@/lib/utils/error-logging";
import { z } from "zod";

/** Robust answer resolution - handles option1, A, option 1, etc. Same logic as quizzes.ts */
function getOrderedOptionKeys(options: Record<string, string>) {
  const optionKeys = Object.keys(options || {});
  return optionKeys.slice().sort((a, b) => {
    const aNum = Number.parseInt(a.replace(/\D/g, ""), 10);
    const bNum = Number.parseInt(b.replace(/\D/g, ""), 10);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return aNum - bNum;
    return a.localeCompare(b);
  });
}

function resolveAnswerIndex(answer: string | undefined, options: Record<string, string>): number | null {
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
}

export type ExamTakingResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Get all available mock exams for a course
 */
export async function getAvailableExamsAction(courseId: string) {
  try {
    const user = await requireAuth();

    const exams = await prisma.quiz.findMany({
      where: {
        courseId,
        isMockExam: true,
      },
      include: {
        contentItem: {
          include: {
            module: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            question: true,
            options: true,
            type: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Batch load all attempts for all exams in a single query
    const examIds = exams.map((e) => e.id);
    const allAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId: user.id,
        quizId: { in: examIds },
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        quizId: true,
        score: true,
        completedAt: true,
      },
    });

    // Get attempt counts in a single aggregation query
    const attemptCounts = await prisma.quizAttempt.groupBy({
      by: ["quizId"],
      where: {
        userId: user.id,
        quizId: { in: examIds },
      },
      _count: {
        id: true,
      },
    });

    const countMap = new Map(attemptCounts.map((c) => [c.quizId, c._count.id]));

    // Group attempts by quizId and get most recent for each
    const attemptsByQuiz = new Map<string, typeof allAttempts[0]>();
    for (const attempt of allAttempts) {
      if (!attemptsByQuiz.has(attempt.quizId)) {
        attemptsByQuiz.set(attempt.quizId, attempt);
      }
    }

    // Combine exam data with attempts
    const examsWithAttempts = exams.map((exam) => ({
      ...exam,
      latestAttempt: attemptsByQuiz.get(exam.id) || null,
      attemptCount: countMap.get(exam.id) || 0,
    }));

    return {
      success: true,
      data: examsWithAttempts,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get available exams: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors du chargement des examens",
    };
  }
}

/**
 * Get exam with all questions (for taking the exam)
 */
export async function getExamForTakingAction(examId: string) {
  try {
    const user = await requireAuth();

    const exam = await prisma.quiz.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!exam || !exam.isMockExam) {
      return {
        success: false,
        error: "Examen introuvable",
      };
    }

    // Get user's in-progress attempt if exists (score is 0 means in-progress)
    const inProgressAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId: user.id,
        quizId: examId,
        score: 0, // Score of 0 indicates in-progress
      },
      orderBy: { completedAt: "desc" },
    });

    return {
      success: true,
      data: {
        exam: {
          id: exam.id,
          title: exam.title,
          timeLimit: exam.timeLimit,
          passingScore: exam.passingScore,
          examFormat: exam.examFormat,
          questions: exam.questions.map((q) => ({
            id: q.id,
            order: q.order,
            question: q.question,
            options: q.options,
            type: q.type,
          })),
        },
        inProgressAttempt: inProgressAttempt
          ? {
              id: inProgressAttempt.id,
              answers: inProgressAttempt.answers,
              timeSpent: inProgressAttempt.timeSpent,
            }
          : null,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get exam for taking: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors du chargement de l'examen",
    };
  }
}

/**
 * Save exam answers (auto-save during exam)
 */
export async function saveExamAnswersAction(
  examId: string,
  answers: Record<string, string>,
  timeSpent: number
): Promise<ExamTakingResult> {
  try {
    const user = await requireAuth();

    // Check if there's an in-progress attempt
    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId: user.id,
        quizId: examId,
      },
      orderBy: { completedAt: "desc" },
    });

    if (existingAttempt && existingAttempt.score === 0) {
      // Update existing in-progress attempt
      await prisma.quizAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          answers,
          timeSpent,
        },
      });
    } else {
      // Create new attempt (in progress, no score yet)
      await prisma.quizAttempt.create({
        data: {
          userId: user.id,
          quizId: examId,
          answers,
          timeSpent,
          score: 0, // Will be calculated on submission
        },
      });
    }

    return {
      success: true,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to save exam answers: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de la sauvegarde",
    };
  }
}

/**
 * Submit exam (calculate score and finalize)
 */
export async function submitExamAction(
  examId: string,
  answers: Record<string, string>,
  timeSpent: number
): Promise<ExamTakingResult> {
  try {
    const user = await requireAuth();

    // Get exam with questions
    const exam = await prisma.quiz.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!exam) {
      return {
        success: false,
        error: "Examen introuvable",
      };
    }

    // Calculate score using robust answer resolution (handles option1, A, option 1, etc.)
    let correctAnswers = 0;
    const totalQuestions = exam.questions.length;

    exam.questions.forEach((question) => {
      const userAnswer = answers[question.id];
      const correctAnswer = question.correctAnswer;
      if (!correctAnswer || typeof correctAnswer !== "string" || !correctAnswer.trim()) {
        return; // Skip questions with invalid correctAnswer to avoid errors
      }
      if (!userAnswer) return;

      if (question.type === "MULTIPLE_CHOICE") {
        const options = (question.options as Record<string, string>) || {};
        const userIndex = resolveAnswerIndex(userAnswer, options);
        const correctIndex = resolveAnswerIndex(correctAnswer, options);
        if (userIndex !== null && correctIndex !== null && userIndex === correctIndex) {
          correctAnswers++;
        }
      } else {
        // For other types, direct comparison
        if (userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
          correctAnswers++;
        }
      }
    });

    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Find or create attempt
    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId: user.id,
        quizId: examId,
      },
      orderBy: { completedAt: "desc" },
    });

    let attempt;
    if (existingAttempt && existingAttempt.score === 0) {
      // Update existing in-progress attempt
      attempt = await prisma.quizAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          score,
          answers,
          timeSpent,
          completedAt: new Date(),
        },
      });
    } else {
      // Create new attempt
      attempt = await prisma.quizAttempt.create({
        data: {
          userId: user.id,
          quizId: examId,
          score,
          answers,
          timeSpent,
          completedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      data: {
        attempt,
        score,
        passingScore: exam.passingScore,
        passed: score >= exam.passingScore,
        correctAnswers,
        totalQuestions,
        userAnswers: answers, // Include user's answers
        questions: exam.questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || null,
        })),
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to submit exam: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la soumission de l'examen",
    };
  }
}

/**
 * Get exam attempt results
 */
export async function getExamAttemptAction(attemptId: string) {
  try {
    const user = await requireAuth();

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!attempt || attempt.userId !== user.id) {
      return {
        success: false,
        error: "Tentative introuvable",
      };
    }

    return {
      success: true,
      data: attempt,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get exam attempt: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors du chargement de la tentative",
    };
  }
}

