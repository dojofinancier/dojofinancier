"use server";

import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-auth";
import { logServerError } from "@/lib/utils/error-logging";
import type { PaginatedResult } from "@/lib/utils/pagination";
import type { QuizQuestionType } from "@prisma/client";

/**
 * Get all students (admin only)
 */
export async function getStudentsAction(params: {
  cursor?: string;
  limit?: number;
  search?: string;
  suspended?: boolean;
  courseId?: string;
}): Promise<PaginatedResult<any>> {
  try {
    await requireAdmin();

    const limit = params.limit || 20;
    const cursor = params.cursor ? { id: params.cursor } : undefined;

    const where: any = {
      role: "STUDENT",
    };

    if (params.suspended !== undefined) {
      where.suspendedAt = params.suspended ? { not: null } : null;
    }

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: "insensitive" } },
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.courseId) {
      where.enrollments = {
        some: {
          courseId: params.courseId,
        },
      };
    }

    const students = await prisma.user.findMany({
      where,
      take: limit + 1,
      cursor,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        suspendedAt: true,
        _count: {
          select: {
            enrollments: true,
            progressTracking: true,
          },
        },
      },
    });

    const hasMore = students.length > limit;
    const items = hasMore ? students.slice(0, limit) : students;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get students: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      items: [],
      nextCursor: null,
      hasMore: false,
    };
  }
}

/**
 * Get all courses available for student filtering (admin only)
 */
export async function getStudentFilterCoursesAction(): Promise<
  Array<{ id: string; title: string; code: string | null }>
> {
  try {
    await requireAdmin();

    return await prisma.course.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        code: true,
      },
    });
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get student filter courses: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });
    return [];
  }
}

/**
 * Get student details (admin only)
 * Optimized: Fetches data in parallel with smaller payloads
 */
export async function getStudentDetailsAction(studentId: string) {
  try {
    await requireAdmin();

    // Fetch all data in parallel for better performance
    const [student, enrollments, subscriptions, recentProgress, accompagnementEnrollments] =
      await Promise.all([
        // Student basic info
        prisma.user.findUnique({
          where: { id: studentId, role: "STUDENT" },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
            suspendedAt: true,
            role: true,
          },
        }),
        // Enrollments with course info
        prisma.enrollment.findMany({
          where: { userId: studentId },
          orderBy: { purchaseDate: "desc" },
          select: {
            id: true,
            purchaseDate: true,
            expiresAt: true,
            orderNumber: true,
            course: {
              select: {
                id: true,
                title: true,
                code: true,
                category: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        }),
        // Subscriptions
        prisma.subscription.findMany({
          where: { userId: studentId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            stripeSubscriptionId: true,
            status: true,
            currentPeriodEnd: true,
            createdAt: true,
          },
        }),
        // Recent progress (limited fields)
        prisma.progressTracking.findMany({
          where: { userId: studentId },
          orderBy: { lastAccessedAt: "desc" },
          take: 50,
          include: {
            contentItem: {
              select: {
                id: true,
                contentType: true,
                module: {
                  select: {
                    id: true,
                    title: true,
                    course: {
                      select: { id: true, title: true },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.accompagnementEnrollment.findMany({
          where: { userId: studentId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            expiresAt: true,
            isActive: true,
            onboardingCompleted: true,
            createdAt: true,
            product: {
              select: {
                id: true,
                title: true,
                course: { select: { title: true, slug: true } },
              },
            },
          },
        }),
      ]);

    if (!student) {
      return null;
    }

    // Return combined data in the expected format
    return {
      ...student,
      enrollments,
      subscriptions,
      progressTracking: recentProgress,
      accompagnementEnrollments,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get student details: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return null;
  }
}

export type StudentAttemptsResult = {
  quizAttempts: Array<{
    id: string;
    score: number;
    completedAt: Date;
    timeSpent: number | null;
    quiz: {
      id: string;
      title: string;
      passingScore: number;
      isMockExam: boolean;
      course: { id: string; title: string };
    };
  }>;
  /** Active manual corrections grants for mock exams / quizzes */
  quizCorrectionsGrants: Array<{
    id: string;
    quizId: string;
    attemptId: string | null;
    grantedAt: Date;
  }>;
  caseStudyAttempts: Array<{
    id: string;
    score: number;
    passed: boolean;
    completedAt: Date;
    caseStudy: {
      id: string;
      title: string;
      passingScore: number;
      course: { id: string; title: string };
    };
  }>;
};

/**
 * Get student exam/quiz/case study attempts (admin only)
 */
export async function getStudentAttemptsAction(
  studentId: string
): Promise<{ success: true; data: StudentAttemptsResult } | { success: false; error: string }> {
  try {
    await requireAdmin();

    const [quizAttempts, caseStudyAttempts, quizCorrectionsGrants] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId: studentId },
        orderBy: { completedAt: "desc" },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              passingScore: true,
              isMockExam: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.caseStudyAttempt.findMany({
        where: { userId: studentId },
        orderBy: { completedAt: "desc" },
        include: {
          caseStudy: {
            select: {
              id: true,
              title: true,
              passingScore: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.quizCorrectionsGrant.findMany({
        where: { userId: studentId, revokedAt: null },
        select: {
          id: true,
          quizId: true,
          attemptId: true,
          grantedAt: true,
        },
        orderBy: { grantedAt: "desc" },
      }),
    ]);

    return {
      success: true,
      data: {
        quizAttempts: quizAttempts.map((a) => ({
          id: a.id,
          score: a.score,
          completedAt: a.completedAt,
          timeSpent: a.timeSpent,
          quiz: a.quiz,
        })),
        quizCorrectionsGrants: quizCorrectionsGrants.map((g) => ({
          id: g.id,
          quizId: g.quizId,
          attemptId: g.attemptId,
          grantedAt: g.grantedAt,
        })),
        caseStudyAttempts: caseStudyAttempts.map((a) => ({
          id: a.id,
          score: a.score,
          passed: a.passed,
          completedAt: a.completedAt,
          caseStudy: a.caseStudy,
        })),
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get student attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors du chargement des résultats",
    };
  }
}

function quizOptionsToRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v == null) continue;
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

export type AdminQuizAttemptReviewData = {
  quizTitle: string;
  courseTitle: string;
  isMockExam: boolean;
  score: number;
  passingScore: number;
  passed: boolean;
  completedAt: Date;
  userAnswers: Record<string, string>;
  questions: Array<{
    id: string;
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation: string | null;
    type: QuizQuestionType;
  }>;
};

/**
 * Full quiz/exam attempt review for admin (student answers + correct answers + explanations).
 * Scoped to the given student so attempt IDs cannot be used across students from this UI.
 */
export async function getAdminQuizAttemptReviewAction(
  studentUserId: string,
  attemptId: string
): Promise<
  { success: true; data: AdminQuizAttemptReviewData } | { success: false; error: string }
> {
  try {
    await requireAdmin();

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId: studentUserId },
      include: {
        quiz: {
          include: {
            course: { select: { title: true } },
            questions: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!attempt) {
      return { success: false, error: "Tentative introuvable" };
    }

    const rawAnswers = attempt.answers;
    const userAnswers =
      rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
        ? Object.fromEntries(
            Object.entries(rawAnswers as Record<string, unknown>).map(([k, v]) => [
              k,
              v == null ? "" : typeof v === "string" ? v : String(v),
            ])
          )
        : {};

    const questions = attempt.quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: quizOptionsToRecord(q.options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? null,
      type: q.type,
    }));

    return {
      success: true,
      data: {
        quizTitle: attempt.quiz.title,
        courseTitle: attempt.quiz.course.title,
        isMockExam: attempt.quiz.isMockExam,
        score: attempt.score,
        passingScore: attempt.quiz.passingScore,
        passed: attempt.score >= attempt.quiz.passingScore,
        completedAt: attempt.completedAt,
        userAnswers,
        questions,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `getAdminQuizAttemptReviewAction: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors du chargement de la tentative",
    };
  }
}

/**
 * Suspend student account (admin only)
 */
export async function suspendStudentAction(studentId: string) {
  try {
    await requireAdmin();

    const student = await prisma.user.update({
      where: { id: studentId, role: "STUDENT" },
      data: { suspendedAt: new Date() },
    });

    return { success: true, data: student };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to suspend student: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      userId: (await requireAdmin()).id,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la suspension du compte",
    };
  }
}

/**
 * Activate student account (admin only)
 */
export async function activateStudentAction(studentId: string) {
  try {
    await requireAdmin();

    const student = await prisma.user.update({
      where: { id: studentId, role: "STUDENT" },
      data: { suspendedAt: null },
    });

    return { success: true, data: student };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to activate student: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      userId: (await requireAdmin()).id,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de l'activation du compte",
    };
  }
}

function generateTemporaryPassword(length = 20): string {
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

/**
 * Reset a student's Supabase Auth password to a random value (admin only).
 * Returns the temporary password once — share it securely with the student.
 */
export async function resetStudentPasswordAction(studentId: string): Promise<
  | { success: true; data: { email: string; temporaryPassword: string } }
  | { success: false; error: string }
> {
  try {
    await requireAdmin();

    const student = await prisma.user.findUnique({
      where: { id: studentId, role: "STUDENT" },
      select: { id: true, email: true, supabaseId: true },
    });

    if (!student) {
      return { success: false, error: "Étudiant introuvable." };
    }

    if (!student.supabaseId) {
      return {
        success: false,
        error: "Ce compte n'est pas lié à Supabase Auth.",
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return {
        success: false,
        error: "Configuration Supabase manquante sur le serveur.",
      };
    }

    const temporaryPassword = generateTemporaryPassword();
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabase.auth.admin.updateUserById(student.supabaseId, {
      password: temporaryPassword,
    });

    if (error) {
      await logServerError({
        errorMessage: `resetStudentPassword: ${error.message}`,
        stackTrace: undefined,
        severity: "HIGH",
      });
      return {
        success: false,
        error: error.message || "Impossible de réinitialiser le mot de passe.",
      };
    }

    return {
      success: true,
      data: {
        email: student.email,
        temporaryPassword,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `resetStudentPassword: ${error instanceof Error ? error.message : "Unknown"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });
    return {
      success: false,
      error: "Erreur lors de la réinitialisation du mot de passe.",
    };
  }
}

