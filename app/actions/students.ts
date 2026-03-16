"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-auth";
import { logServerError } from "@/lib/utils/error-logging";
import type { PaginatedResult } from "@/lib/utils/pagination";

/**
 * Get all students (admin only)
 */
export async function getStudentsAction(params: {
  cursor?: string;
  limit?: number;
  search?: string;
  suspended?: boolean;
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
 * Get student details (admin only)
 * Optimized: Fetches data in parallel with smaller payloads
 */
export async function getStudentDetailsAction(studentId: string) {
  try {
    await requireAdmin();

    // Fetch all data in parallel for better performance
    const [student, enrollments, subscriptions, recentProgress] = await Promise.all([
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

    const [quizAttempts, caseStudyAttempts] = await Promise.all([
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

