"use server";

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/utils/error-logging";
import { calculateStreak } from "@/lib/accompagnement/weekly";
import { getEasternWeekStart } from "@/lib/accompagnement/schedule";
import type {
  StudyPlanHorizonV1,
  SelectedChapterDetail,
} from "@/lib/accompagnement/study-plan";
import {
  parseStudyPlanHorizonJson,
  regenerateAccompagnementStudyPlan,
} from "@/lib/accompagnement/study-plan";
import { enrichWeakAreasWithTopicLabels } from "@/lib/accompagnement/adaptive-topic-label";
import { sortWeakAreasForDisplay } from "@/lib/accompagnement/weak-areas-display";
import { normalizePhoneToE164 } from "@/lib/utils/phone-e164";

export type { StudyPlanHorizonV1 } from "@/lib/accompagnement/study-plan";

export type ChapterConfirmationEntry = {
  chapter: number;
  status: "COMPLETED" | "PARTIAL" | "NOT_COMPLETED";
};

function normalizeChapterConfirmations(raw: unknown): ChapterConfirmationEntry[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: ChapterConfirmationEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.chapter !== "number") continue;
    if (
      o.status === "COMPLETED" ||
      o.status === "PARTIAL" ||
      o.status === "NOT_COMPLETED"
    ) {
      out.push({ chapter: o.chapter, status: o.status });
    }
  }
  return out;
}

function normalizeSelectedChaptersDetail(raw: unknown): SelectedChapterDetail[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: SelectedChapterDetail[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.chapter !== "number") continue;
    if (typeof o.primaryModality !== "string") continue;
    if (typeof o.secondaryModality !== "string") continue;
    if (typeof o.reason !== "string") continue;
    out.push({
      chapter: o.chapter,
      primaryModality: o.primaryModality as SelectedChapterDetail["primaryModality"],
      secondaryModality: o.secondaryModality as SelectedChapterDetail["secondaryModality"],
      reason: o.reason,
    });
  }
  return out;
}

/** One active accompagnement subscription (per course product). */
export type AccompagnementEnrollmentSummary = {
  id: string;
  accompagnementProductId: string;
  onboardingCompleted: boolean;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  channel: "EMAIL" | "SMS";
  phoneE164: string | null;
  product: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    courseId: string;
    courseTitle: string;
  };
  onboarding: {
    examDate: Date | null;
    studyHoursPerWeek: number;
  } | null;
};

export type AccompagnementStatus = {
  /** Active accompagnement enrollments (e.g. ERCI + NEGP if subscribed to both). */
  enrollments: AccompagnementEnrollmentSummary[];
};

export async function getAccompagnementStatusAction(): Promise<{
  success: boolean;
  data?: AccompagnementStatus;
  /** Same as authenticated user id — avoids a second round-trip for payment / tabs. */
  currentUserId?: string;
  availableProducts?: Array<{
    id: string;
    title: string;
    description: string | null;
    price: number;
    courseId: string;
    courseTitle: string;
  }>;
  error?: string;
}> {
  try {
    const user = await requireAuth();

    const courseEnrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, expiresAt: { gte: new Date() } },
      select: { courseId: true },
    });
    const courseIds = [...new Set(courseEnrollments.map((e) => e.courseId))];

    const enrollments = await prisma.accompagnementEnrollment.findMany({
      where: {
        userId: user.id,
        isActive: true,
        expiresAt: { gte: new Date() },
      },
      include: {
        product: {
          include: { course: { select: { title: true } } },
        },
        onboarding: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const subscribedProductIds = enrollments.map((e) => e.accompagnementProductId);

    const availableWhere: Prisma.AccompagnementProductWhereInput = {
      published: true,
      courseId: { in: courseIds },
      ...(subscribedProductIds.length > 0
        ? { id: { notIn: subscribedProductIds } }
        : {}),
    };

    const availableProducts = await prisma.accompagnementProduct.findMany({
      where: availableWhere,
      include: { course: { select: { title: true } } },
      orderBy: { title: "asc" },
    });

    return {
      success: true,
      currentUserId: user.id,
      data: {
        enrollments: enrollments.map((e) => ({
          id: e.id,
          accompagnementProductId: e.accompagnementProductId,
          onboardingCompleted: e.onboardingCompleted,
          isActive: e.isActive,
          expiresAt: e.expiresAt,
          createdAt: e.createdAt,
          channel: e.channel,
          phoneE164: e.phoneE164,
          product: {
            id: e.product.id,
            title: e.product.title,
            description: e.product.description,
            price: Number(e.product.price),
            courseId: e.product.courseId,
            courseTitle: e.product.course.title,
          },
          onboarding: e.onboarding
            ? {
                examDate: e.onboarding.examDate,
                studyHoursPerWeek: e.onboarding.studyHoursPerWeek,
              }
            : null,
        })),
      },
      availableProducts: availableProducts.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: Number(p.price),
        courseId: p.courseId,
        courseTitle: p.course.title,
      })),
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get accompagnement status: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

// ─── Stats ─────────────────────────────────────────────────────────────────

export type AccompagnementStats = {
  streak: number;
  responseRate: number;
  avgScore: number | null;
  totalCheckIns: number;
  respondedCount: number;
  missedCount: number;
  daysUntilExam: number | null;
};

export async function getAccompagnementStatsAction(
  enrollmentId: string
): Promise<{ success: boolean; data?: AccompagnementStats; error?: string }> {
  try {
    const user = await requireAuth();

    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: { id: enrollmentId, userId: user.id },
      include: { onboarding: { select: { examDate: true } } },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }

    const allCheckIns = await prisma.dailyCheckIn.findMany({
      where: { enrollmentId },
      orderBy: { scheduledFor: "desc" },
      select: { status: true },
      take: 200,
    });

    const scores = await prisma.checkInResponse.findMany({
      where: {
        checkIn: { enrollmentId },
        score: { not: null },
      },
      select: { score: true },
    });

    const totalCheckIns = allCheckIns.length;
    const respondedCount = allCheckIns.filter(
      (c) => c.status === "RESPONDED"
    ).length;
    const missedCount = allCheckIns.filter((c) => c.status === "MISSED").length;
    const evaluatedCount = respondedCount + missedCount;
    const responseRate =
      evaluatedCount > 0
        ? Math.round((respondedCount / evaluatedCount) * 100)
        : 0;

    const validScores = scores
      .map((s) => s.score)
      .filter((s): s is number => s !== null);
    const avgScore =
      validScores.length > 0
        ? Math.round(
            validScores.reduce((a, b) => a + b, 0) / validScores.length
          )
        : null;

    const streak = await calculateStreak(enrollmentId);

    const daysUntilExam = enrollment.onboarding?.examDate
      ? Math.max(
          0,
          Math.ceil(
            (enrollment.onboarding.examDate.getTime() - Date.now()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : null;

    return {
      success: true,
      data: {
        streak,
        responseRate,
        avgScore,
        totalCheckIns,
        respondedCount,
        missedCount,
        daysUntilExam,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get accompagnement stats: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

// ─── Check-in history ──────────────────────────────────────────────────────

export type CheckInHistoryAnswer = {
  orderIndex: number;
  source: "MCQ" | "OEQ";
  questionText: string;
  options: Record<string, string> | null;
  correctAnswer: string | null;
  explanation: string | null;
  modelAnswer: string | null;
  studentAnswer: string | null;
  isCorrect: boolean | null;
  aiLabel: string | null;
  aiFeedback: string | null;
  chapter: number;
  topic: string;
};

export type CheckInHistoryEntry = {
  id: string;
  scheduledFor: Date;
  status: string;
  type: string;
  contextLine: string | null;
  answers: CheckInHistoryAnswer[];
  response: {
    score: number | null;
    responseRate: number | null;
    yesNoReply: boolean | null;
    respondedAt: Date;
  } | null;
};

/** DB-only: map paged check-ins to history entries (shared by history action + dashboard bundle). */
async function fetchCheckInHistoryEntries(
  enrollmentId: string,
  page: number,
  limit: number
): Promise<{ entries: CheckInHistoryEntry[]; total: number }> {
  const [checkIns, total] = await Promise.all([
    prisma.dailyCheckIn.findMany({
      where: { enrollmentId },
      orderBy: { scheduledFor: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        answers: { orderBy: { orderIndex: "asc" } },
        response: {
          select: {
            score: true,
            responseRate: true,
            yesNoReply: true,
            respondedAt: true,
          },
        },
      },
    }),
    prisma.dailyCheckIn.count({ where: { enrollmentId } }),
  ]);

  const mcqIds = new Set<string>();
  const oeqIds = new Set<string>();
  for (const ci of checkIns) {
    for (const a of ci.answers) {
      if (a.source === "MCQ") mcqIds.add(a.adaptiveQuestionId);
      else oeqIds.add(a.adaptiveQuestionId);
    }
  }

  const [mcqRows, oeqRows] = await Promise.all([
    mcqIds.size > 0
      ? prisma.adaptiveMcq.findMany({
          where: { id: { in: Array.from(mcqIds) } },
          select: {
            id: true,
            questionText: true,
            options: true,
            correctAnswer: true,
            explanation: true,
          },
        })
      : Promise.resolve([]),
    oeqIds.size > 0
      ? prisma.adaptiveOeq.findMany({
          where: { id: { in: Array.from(oeqIds) } },
          select: {
            id: true,
            questionText: true,
            modelAnswer: true,
            explanation: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const mcqMap = new Map(mcqRows.map((r) => [r.id, r]));
  const oeqMap = new Map(oeqRows.map((r) => [r.id, r]));

  const entries = checkIns.map((ci) => ({
    id: ci.id,
    scheduledFor: ci.scheduledFor,
    status: ci.status,
    type: ci.type,
    contextLine: ci.contextLineBody,
    response: ci.response
      ? {
          score: ci.response.score,
          responseRate: ci.response.responseRate,
          yesNoReply: ci.response.yesNoReply,
          respondedAt: ci.response.respondedAt,
        }
      : null,
    answers: ci.answers.map((a): CheckInHistoryAnswer => {
      const classification = a.aiClassification as
        | { label?: string; feedback?: string }
        | null;
      if (a.source === "MCQ") {
        const m = mcqMap.get(a.adaptiveQuestionId);
        return {
          orderIndex: a.orderIndex,
          source: "MCQ",
          questionText: m?.questionText ?? "(Question indisponible)",
          options: (m?.options as Record<string, string> | null) ?? null,
          correctAnswer: m?.correctAnswer ?? null,
          explanation: m?.explanation ?? null,
          modelAnswer: null,
          studentAnswer: a.studentAnswer,
          isCorrect: a.isCorrect,
          aiLabel: classification?.label ?? null,
          aiFeedback: classification?.feedback ?? null,
          chapter: a.adaptiveChapter,
          topic: a.adaptiveTopic,
        };
      }
      const o = oeqMap.get(a.adaptiveQuestionId);
      return {
        orderIndex: a.orderIndex,
        source: "OEQ",
        questionText: o?.questionText ?? "(Question indisponible)",
        options: null,
        correctAnswer: null,
        explanation: o?.explanation ?? null,
        modelAnswer: o?.modelAnswer ?? null,
        studentAnswer: a.studentAnswer,
        isCorrect: a.isCorrect,
        aiLabel: classification?.label ?? null,
        aiFeedback: classification?.feedback ?? null,
        chapter: a.adaptiveChapter,
        topic: a.adaptiveTopic,
      };
    }),
  }));

  return { entries, total };
}

export async function getCheckInHistoryAction(
  enrollmentId: string,
  page = 1,
  limit = 10
): Promise<{
  success: boolean;
  data?: CheckInHistoryEntry[];
  total?: number;
  error?: string;
}> {
  try {
    const user = await requireAuth();

    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: { id: enrollmentId, userId: user.id },
      select: { id: true },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }

    const { entries, total } = await fetchCheckInHistoryEntries(
      enrollmentId,
      page,
      limit
    );

    return {
      success: true,
      total,
      data: entries,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get check-in history: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

export type AccompagnementEnrollmentDashboardBundle = {
  stats: AccompagnementStats;
  history: CheckInHistoryEntry[];
  historyTotal: number;
  weekly: WeeklyPlanBundle;
  review: WeeklyReviewSummary | null;
  weakAreas: WeakAreaEntry[];
  prefs: {
    channel: "EMAIL" | "SMS";
    phoneE164: string | null;
    examDate: string;
    checkInsPaused: boolean;
  };
  studyPlanHorizon: StudyPlanHorizonV1 | null;
  compressedMode: boolean;
  ackUnrealisticSchedule: boolean;
  /** True when the plan is unrealistic and the student has not acknowledged yet. */
  showUnrealisticScheduleModal: boolean;
};

/**
 * One server round-trip for the student accompagnement dashboard (after onboarding).
 * Replaces 6 separate actions × auth + enrollment verification.
 */
export async function getAccompagnementEnrollmentDashboardBundleAction(
  enrollmentId: string,
  historyPage = 1,
  historyLimit = 10
): Promise<{
  success: boolean;
  data?: AccompagnementEnrollmentDashboardBundle;
  error?: string;
}> {
  try {
    const user = await requireAuth();

    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: { id: enrollmentId, userId: user.id },
      include: {
        onboarding: { select: { examDate: true } },
        product: { select: { course: { select: { slug: true } } } },
        user: { select: { phone: true } },
      },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }
    if (!enrollment.onboardingCompleted) {
      return { success: false, error: "Configuration requise" };
    }

    const prefsPhoneE164 =
      enrollment.phoneE164 ??
      normalizePhoneToE164(enrollment.user.phone ?? "");

    const weekStart = getEasternWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const thirty = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [
      statusRows,
      scores,
      historyBundle,
      plan,
      weekCheckIns,
      review,
      weakSignals,
    ] = await Promise.all([
      prisma.dailyCheckIn.findMany({
        where: { enrollmentId },
        orderBy: { scheduledFor: "desc" },
        take: 200,
        select: { status: true },
      }),
      prisma.checkInResponse.findMany({
        where: {
          checkIn: { enrollmentId },
          score: { not: null },
        },
        select: { score: true },
      }),
      fetchCheckInHistoryEntries(enrollmentId, historyPage, historyLimit),
      prisma.weeklyPlan.findUnique({
        where: {
          enrollmentId_weekStartDate: {
            enrollmentId,
            weekStartDate: weekStart,
          },
        },
      }),
      prisma.dailyCheckIn.findMany({
        where: {
          enrollmentId,
          scheduledFor: { gte: weekStart, lte: weekEnd },
        },
        orderBy: { scheduledFor: "asc" },
        select: {
          id: true,
          scheduledFor: true,
          status: true,
          type: true,
        },
      }),
      prisma.weeklyReview.findFirst({
        where: { enrollmentId },
        orderBy: { weekStartDate: "desc" },
      }),
      prisma.weakAreaSignal.findMany({
        where: { enrollmentId, createdAt: { gte: thirty } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const totalCheckIns = statusRows.length;
    const respondedCount = statusRows.filter(
      (c) => c.status === "RESPONDED"
    ).length;
    const missedCount = statusRows.filter((c) => c.status === "MISSED").length;
    const evaluatedCount = respondedCount + missedCount;
    const responseRate =
      evaluatedCount > 0
        ? Math.round((respondedCount / evaluatedCount) * 100)
        : 0;

    let streak = 0;
    for (let i = 0; i < Math.min(90, statusRows.length); i++) {
      const row = statusRows[i];
      if (row.status === "RESPONDED") streak++;
      else if (row.status === "MISSED") break;
    }

    const validScores = scores
      .map((s) => s.score)
      .filter((s): s is number => s !== null);
    const avgScore =
      validScores.length > 0
        ? Math.round(
            validScores.reduce((a, b) => a + b, 0) / validScores.length
          )
        : null;

    const daysUntilExam = enrollment.onboarding?.examDate
      ? Math.max(
          0,
          Math.ceil(
            (enrollment.onboarding.examDate.getTime() - Date.now()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : null;

    const stats: AccompagnementStats = {
      streak,
      responseRate,
      avgScore,
      totalCheckIns,
      respondedCount,
      missedCount,
      daysUntilExam,
    };

    const weekly: WeeklyPlanBundle = {
      weekStart,
      plannedChapters: (plan?.plannedChapters as number[] | null) ?? [],
      focusTopics: (plan?.focusTopics as string[] | null) ?? [],
      checkIns: weekCheckIns.map((c) => ({
        id: c.id,
        scheduledFor: c.scheduledFor,
        status: c.status,
        type: c.type,
      })),
      phase: plan?.phase ?? null,
      planStatus: plan?.planStatus ?? null,
      weeklyGoalSummary: plan?.weeklyGoalSummary ?? null,
      selectedChaptersDetail: normalizeSelectedChaptersDetail(
        plan?.selectedChaptersDetail
      ),
      chapterConfirmations: normalizeChapterConfirmations(
        plan?.chapterConfirmations
      ),
      estimatedHours: plan?.estimatedHours ?? null,
    };

    const reviewOut: WeeklyReviewSummary | null = review
      ? {
          weekStartDate: review.weekStartDate,
          score: review.score,
          responseRate: review.responseRate,
          summaryMarkdown: review.summaryMarkdown,
          weakAreas:
            (review.weakAreas as Array<{
              chapter: number;
              topic: string;
              hitCount: number;
            }>) ?? [],
          coveredTopics:
            (review.coveredTopics as Array<{
              chapter: number;
              topic: string;
            }>) ?? [],
        }
      : null;

    const weakMap = new Map<
      string,
      { chapter: number; topic: string; hitCount: number; lastSeen: Date }
    >();
    for (const s of weakSignals) {
      const key = `${s.chapter}:${s.topic}`;
      const existing = weakMap.get(key);
      if (existing) {
        existing.hitCount++;
        if (s.createdAt > existing.lastSeen) existing.lastSeen = s.createdAt;
      } else {
        weakMap.set(key, {
          chapter: s.chapter,
          topic: s.topic,
          hitCount: 1,
          lastSeen: s.createdAt,
        });
      }
    }
    const weakAreasRaw = Array.from(weakMap.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 8);

    const courseSlug = enrollment.product?.course?.slug ?? null;
    const weakAreas = sortWeakAreasForDisplay(
      await enrichWeakAreasWithTopicLabels(courseSlug, weakAreasRaw)
    );

    const examDate =
      enrollment.onboarding?.examDate != null
        ? enrollment.onboarding.examDate.toISOString().slice(0, 10)
        : "";

    const studyPlanHorizon = parseStudyPlanHorizonJson(
      enrollment.studyPlanHorizon
    );
    const showUnrealisticScheduleModal =
      studyPlanHorizon?.globalPlanStatus === "unrealistic" &&
      !enrollment.ackUnrealisticSchedule;

    return {
      success: true,
      data: {
        stats,
        history: historyBundle.entries,
        historyTotal: historyBundle.total,
        weekly,
        review: reviewOut,
        weakAreas,
        prefs: {
          channel: enrollment.channel,
          phoneE164: prefsPhoneE164,
          examDate,
          checkInsPaused: enrollment.checkInsPaused,
        },
        studyPlanHorizon,
        compressedMode: enrollment.compressedMode,
        ackUnrealisticSchedule: enrollment.ackUnrealisticSchedule,
        showUnrealisticScheduleModal,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to load accompagnement dashboard bundle: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

// ─── Weekly plan + review ──────────────────────────────────────────────────

export type WeeklyPlanEntry = {
  id: string;
  scheduledFor: Date;
  status: string;
  type: string;
};

export type WeeklyPlanBundle = {
  weekStart: Date | null;
  plannedChapters: number[];
  focusTopics: string[];
  checkIns: WeeklyPlanEntry[];
  phase: string | null;
  planStatus: string | null;
  weeklyGoalSummary: string | null;
  selectedChaptersDetail: SelectedChapterDetail[];
  chapterConfirmations: ChapterConfirmationEntry[];
  estimatedHours: number | null;
};

export async function getWeeklyPlanAction(
  enrollmentId: string
): Promise<{ success: boolean; data?: WeeklyPlanBundle; error?: string }> {
  try {
    const user = await requireAuth();

    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: { id: enrollmentId, userId: user.id },
      select: { id: true },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }

    const weekStart = getEasternWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [plan, checkIns] = await Promise.all([
      prisma.weeklyPlan.findUnique({
        where: {
          enrollmentId_weekStartDate: {
            enrollmentId,
            weekStartDate: weekStart,
          },
        },
      }),
      prisma.dailyCheckIn.findMany({
        where: {
          enrollmentId,
          scheduledFor: { gte: weekStart, lte: weekEnd },
        },
        orderBy: { scheduledFor: "asc" },
        select: {
          id: true,
          scheduledFor: true,
          status: true,
          type: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        weekStart,
        plannedChapters: (plan?.plannedChapters as number[] | null) ?? [],
        focusTopics: (plan?.focusTopics as string[] | null) ?? [],
        checkIns: checkIns.map((c) => ({
          id: c.id,
          scheduledFor: c.scheduledFor,
          status: c.status,
          type: c.type,
        })),
        phase: plan?.phase ?? null,
        planStatus: plan?.planStatus ?? null,
        weeklyGoalSummary: plan?.weeklyGoalSummary ?? null,
        selectedChaptersDetail: normalizeSelectedChaptersDetail(
          plan?.selectedChaptersDetail
        ),
        chapterConfirmations: normalizeChapterConfirmations(
          plan?.chapterConfirmations
        ),
        estimatedHours: plan?.estimatedHours ?? null,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get weekly plan: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

export type WeeklyReviewSummary = {
  weekStartDate: Date;
  score: number | null;
  responseRate: number | null;
  summaryMarkdown: string | null;
  weakAreas: Array<{ chapter: number; topic: string; hitCount: number }>;
  coveredTopics: Array<{ chapter: number; topic: string }>;
};

export async function getLatestWeeklyReviewAction(
  enrollmentId: string
): Promise<{ success: boolean; data?: WeeklyReviewSummary | null; error?: string }> {
  try {
    const user = await requireAuth();
    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: { id: enrollmentId, userId: user.id },
      select: { id: true },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }

    const review = await prisma.weeklyReview.findFirst({
      where: { enrollmentId },
      orderBy: { weekStartDate: "desc" },
    });
    if (!review) return { success: true, data: null };

    return {
      success: true,
      data: {
        weekStartDate: review.weekStartDate,
        score: review.score,
        responseRate: review.responseRate,
        summaryMarkdown: review.summaryMarkdown,
        weakAreas:
          (review.weakAreas as Array<{
            chapter: number;
            topic: string;
            hitCount: number;
          }>) ?? [],
        coveredTopics:
          (review.coveredTopics as Array<{
            chapter: number;
            topic: string;
          }>) ?? [],
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get latest weekly review: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

// ─── Weak areas ────────────────────────────────────────────────────────────

export type WeakAreaEntry = {
  chapter: number;
  topic: string;
  hitCount: number;
  lastSeen: Date;
};

export async function getWeakAreasAction(
  enrollmentId: string
): Promise<{ success: boolean; data?: WeakAreaEntry[]; error?: string }> {
  try {
    const user = await requireAuth();
    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: { id: enrollmentId, userId: user.id },
      select: {
        id: true,
        product: { select: { course: { select: { slug: true } } } },
      },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }

    const thirty = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const signals = await prisma.weakAreaSignal.findMany({
      where: { enrollmentId, createdAt: { gte: thirty } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const map = new Map<
      string,
      { chapter: number; topic: string; hitCount: number; lastSeen: Date }
    >();
    for (const s of signals) {
      const key = `${s.chapter}:${s.topic}`;
      const existing = map.get(key);
      if (existing) {
        existing.hitCount++;
        if (s.createdAt > existing.lastSeen) existing.lastSeen = s.createdAt;
      } else {
        map.set(key, {
          chapter: s.chapter,
          topic: s.topic,
          hitCount: 1,
          lastSeen: s.createdAt,
        });
      }
    }

    const topRaw = Array.from(map.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 8);

    const courseSlug = enrollment.product?.course?.slug ?? null;
    const top = sortWeakAreasForDisplay(
      await enrichWeakAreasWithTopicLabels(courseSlug, topRaw)
    );

    return { success: true, data: top };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get weak areas: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

// ─── Preferences (channel + exam date) ───────────────────────────────────────

const updateAccompagnementPreferencesSchema = z.object({
  enrollmentId: z.string().min(1),
  channel: z.enum(["EMAIL", "SMS"]),
  /** Raw input; normalized with `normalizePhoneToE164` when channel is SMS. */
  phoneE164: z.string().nullable().optional(),
  examDate: z.string().nullable().optional(),
});

export async function getAccompagnementPreferencesAction(enrollmentId: string): Promise<{
  success: boolean;
  data?: {
    channel: "EMAIL" | "SMS";
    phoneE164: string | null;
    examDate: string;
    checkInsPaused: boolean;
  };
  error?: string;
}> {
  try {
    const user = await requireAuth();
    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: { id: enrollmentId, userId: user.id },
      select: {
        channel: true,
        phoneE164: true,
        checkInsPaused: true,
        onboardingCompleted: true,
        onboarding: { select: { examDate: true } },
        user: { select: { phone: true } },
      },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }
    if (!enrollment.onboardingCompleted) {
      return { success: false, error: "Configuration requise" };
    }
    const examDate =
      enrollment.onboarding?.examDate != null
        ? enrollment.onboarding.examDate.toISOString().slice(0, 10)
        : "";
    const phoneE164 =
      enrollment.phoneE164 ??
      normalizePhoneToE164(enrollment.user.phone ?? "");

    return {
      success: true,
      data: {
        channel: enrollment.channel,
        phoneE164,
        examDate,
        checkInsPaused: enrollment.checkInsPaused,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get accompagnement preferences: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors du chargement" };
  }
}

export async function updateAccompagnementPreferencesAction(
  input: z.infer<typeof updateAccompagnementPreferencesSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    const parsed = updateAccompagnementPreferencesSchema.parse(input);

    let phoneE164ForSms: string | null = null;
    if (parsed.channel === "SMS") {
      phoneE164ForSms = normalizePhoneToE164(
        (parsed.phoneE164 ?? "").trim()
      );
      if (!phoneE164ForSms) {
        return {
          success: false,
          error:
            "Pour le SMS, saisis un numéro valide au format international (ex. +14165551234) ou 10 chiffres pour l’Amérique du Nord.",
        };
      }
    }

    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: {
        id: parsed.enrollmentId,
        userId: user.id,
        isActive: true,
        onboardingCompleted: true,
      },
      select: { id: true },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable ou inactive" };
    }

    let examDate: Date | null = null;
    if (parsed.examDate && parsed.examDate.trim() !== "") {
      const d = new Date(parsed.examDate);
      if (Number.isNaN(d.getTime())) {
        return { success: false, error: "Date d'examen invalide" };
      }
      examDate = d;
    }

    await prisma.$transaction([
      prisma.accompagnementEnrollment.update({
        where: { id: parsed.enrollmentId },
        data: {
          channel: parsed.channel,
          phoneE164:
            parsed.channel === "SMS" ? phoneE164ForSms : null,
        },
      }),
      prisma.accompagnementOnboarding.upsert({
        where: { enrollmentId: parsed.enrollmentId },
        create: {
          enrollmentId: parsed.enrollmentId,
          examDate,
          studyHoursPerWeek: 6,
        },
        update: { examDate },
      }),
    ]);

    const regen = await regenerateAccompagnementStudyPlan(parsed.enrollmentId);
    if (regen.error) {
      await logServerError({
        errorMessage: `Study plan regen after prefs: ${regen.error}`,
        severity: "MEDIUM",
      });
    }

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to update accompagnement preferences: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }
}

const setAccompagnementCheckInsPausedSchema = z.object({
  enrollmentId: z.string().min(1),
  paused: z.boolean(),
});

export async function setAccompagnementCheckInsPausedAction(
  input: z.infer<typeof setAccompagnementCheckInsPausedSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    const parsed = setAccompagnementCheckInsPausedSchema.parse(input);

    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: {
        id: parsed.enrollmentId,
        userId: user.id,
        isActive: true,
        onboardingCompleted: true,
      },
      select: { id: true },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable ou inactive" };
    }

    await prisma.accompagnementEnrollment.update({
      where: { id: parsed.enrollmentId },
      data: {
        checkInsPaused: parsed.paused,
        ...(parsed.paused ? { nextCheckInOverride: null } : {}),
      },
    });

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `set check-ins paused: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }
}

export async function acknowledgeUnrealisticScheduleAction(
  enrollmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    if (!enrollmentId?.trim()) {
      return { success: false, error: "Inscription manquante" };
    }

    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: {
        id: enrollmentId,
        userId: user.id,
        isActive: true,
        onboardingCompleted: true,
      },
      select: { id: true },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable ou inactive" };
    }

    await prisma.accompagnementEnrollment.update({
      where: { id: enrollmentId },
      data: { ackUnrealisticSchedule: true, compressedMode: true },
    });

    const regen = await regenerateAccompagnementStudyPlan(enrollmentId);
    if (regen.error) {
      await logServerError({
        errorMessage: `Study plan after unrealistic ack: ${regen.error}`,
        severity: "MEDIUM",
      });
    }

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `ack unrealistic schedule: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }
}

const submitWeeklyChapterConfirmationsSchema = z.object({
  enrollmentId: z.string().min(1),
  confirmations: z
    .array(
      z.object({
        chapter: z.number().int(),
        status: z.enum(["COMPLETED", "PARTIAL", "NOT_COMPLETED"]),
      })
    )
    .min(1),
});

export async function submitWeeklyChapterConfirmationsAction(
  input: z.infer<typeof submitWeeklyChapterConfirmationsSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    const parsed = submitWeeklyChapterConfirmationsSchema.parse(input);

    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: {
        id: parsed.enrollmentId,
        userId: user.id,
        isActive: true,
        onboardingCompleted: true,
      },
      select: { id: true },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable ou inactive" };
    }

    const weekStart = getEasternWeekStart(new Date());
    let plan = await prisma.weeklyPlan.findUnique({
      where: {
        enrollmentId_weekStartDate: {
          enrollmentId: parsed.enrollmentId,
          weekStartDate: weekStart,
        },
      },
    });

    if (!plan) {
      await regenerateAccompagnementStudyPlan(parsed.enrollmentId);
      plan = await prisma.weeklyPlan.findUnique({
        where: {
          enrollmentId_weekStartDate: {
            enrollmentId: parsed.enrollmentId,
            weekStartDate: weekStart,
          },
        },
      });
    }

    if (!plan) {
      return {
        success: false,
        error: "Aucun plan hebdomadaire pour cette semaine",
      };
    }

    const existing = normalizeChapterConfirmations(plan.chapterConfirmations);
    const byChapter = new Map(existing.map((e) => [e.chapter, e]));
    for (const c of parsed.confirmations) {
      byChapter.set(c.chapter, c);
    }
    const merged = Array.from(byChapter.values()).sort(
      (a, b) => a.chapter - b.chapter
    );

    await prisma.weeklyPlan.update({
      where: { id: plan.id },
      data: {
        chapterConfirmations: merged as unknown as Prisma.InputJsonValue,
      },
    });

    const regen = await regenerateAccompagnementStudyPlan(parsed.enrollmentId);
    if (regen.error) {
      await logServerError({
        errorMessage: `Study plan after chapter confirmations: ${regen.error}`,
        severity: "MEDIUM",
      });
    }

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `submit chapter confirmations: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      severity: "MEDIUM",
    });
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }
}
