/**
 * Weekly aggregation, WeeklyReview + WeeklyPlan generation, and streak helpers.
 */

import { prisma } from "@/lib/prisma";
import { getEasternWeekStart } from "./schedule";
import { generateWeeklySummary } from "@/lib/ai/accompagnement";
import { regenerateAccompagnementStudyPlan } from "@/lib/accompagnement/study-plan";

export interface WeeklyAggregates {
  totalCheckIns: number;
  respondedCount: number;
  missedCount: number;
  avgScore: number | null;
  responseRate: number;
  weakAreas: Array<{ chapter: number; topic: string; hitCount: number }>;
  coveredTopics: Array<{ chapter: number; topic: string }>;
}

export async function calculateStreak(enrollmentId: string): Promise<number> {
  const recent = await prisma.dailyCheckIn.findMany({
    where: { enrollmentId },
    orderBy: { scheduledFor: "desc" },
    take: 90,
    select: { status: true },
  });

  let streak = 0;
  for (const ci of recent) {
    if (ci.status === "RESPONDED") streak++;
    else if (ci.status === "MISSED") break;
    // SCHEDULED / SENT don't break — they're still pending
  }
  return streak;
}

export async function aggregateWeek(
  enrollmentId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyAggregates> {
  const checkIns = await prisma.dailyCheckIn.findMany({
    where: {
      enrollmentId,
      scheduledFor: { gte: weekStart, lte: weekEnd },
    },
    select: {
      id: true,
      status: true,
      response: { select: { score: true } },
    },
  });

  const totalCheckIns = checkIns.length;
  const respondedCount = checkIns.filter((c) => c.status === "RESPONDED").length;
  const missedCount = checkIns.filter((c) => c.status === "MISSED").length;
  const scores = checkIns
    .map((c) => c.response?.score)
    .filter((s): s is number => typeof s === "number");
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
  const responseRate =
    totalCheckIns > 0 ? Math.round((respondedCount / totalCheckIns) * 100) : 0;

  // Weak areas: wrong MCQ answers during the week grouped by (chapter, topic)
  const wrongAnswers = await prisma.checkInAnswer.findMany({
    where: {
      checkIn: { enrollmentId, scheduledFor: { gte: weekStart, lte: weekEnd } },
      source: "MCQ",
      isCorrect: false,
    },
    select: { adaptiveChapter: true, adaptiveTopic: true },
  });
  const weakMap = new Map<string, { chapter: number; topic: string; hitCount: number }>();
  for (const w of wrongAnswers) {
    const key = `${w.adaptiveChapter}:${w.adaptiveTopic}`;
    const existing = weakMap.get(key);
    if (existing) existing.hitCount++;
    else
      weakMap.set(key, {
        chapter: w.adaptiveChapter,
        topic: w.adaptiveTopic,
        hitCount: 1,
      });
  }
  const weakAreas = Array.from(weakMap.values())
    .sort((a, b) => b.hitCount - a.hitCount)
    .slice(0, 5);

  // Covered topics: distinct (chapter, topic) answered during the week
  const answered = await prisma.checkInAnswer.findMany({
    where: {
      checkIn: { enrollmentId, scheduledFor: { gte: weekStart, lte: weekEnd } },
    },
    distinct: ["adaptiveChapter", "adaptiveTopic"],
    select: { adaptiveChapter: true, adaptiveTopic: true },
  });
  const coveredTopics = answered.map((a) => ({
    chapter: a.adaptiveChapter,
    topic: a.adaptiveTopic,
  }));

  return {
    totalCheckIns,
    respondedCount,
    missedCount,
    avgScore,
    responseRate,
    weakAreas,
    coveredTopics,
  };
}

/**
 * Generates and upserts both WeeklyReview (for the week just ended) and
 * WeeklyPlan (for the next week) for a single enrollment.
 * Returns `{ review, plan }` for downstream notifications.
 */
export async function generateWeeklyReviewAndPlan(params: {
  enrollmentId: string;
  weekStart: Date;
  weekEnd: Date;
  studentFirstName: string;
  examDate: Date | null;
  aiModel: string;
}): Promise<{
  reviewId: string;
  planId: string;
  summaryMarkdown: string;
  aggregates: WeeklyAggregates;
  streak: number;
  plannedChapters: number[];
}> {
  const aggregates = await aggregateWeek(
    params.enrollmentId,
    params.weekStart,
    params.weekEnd
  );
  const streak = await calculateStreak(params.enrollmentId);

  const weekNumber = await weekNumberSinceEnrollment(
    params.enrollmentId,
    params.weekStart
  );

  await regenerateAccompagnementStudyPlan(params.enrollmentId, new Date());

  const currentWeekKey = getEasternWeekStart(new Date());
  const planRow = await prisma.weeklyPlan.findUnique({
    where: {
      enrollmentId_weekStartDate: {
        enrollmentId: params.enrollmentId,
        weekStartDate: currentWeekKey,
      },
    },
  });
  const plannedChapters = Array.isArray(planRow?.plannedChapters)
    ? (planRow!.plannedChapters as unknown as number[])
    : [];

  const summaryMarkdown = await generateWeeklySummary(
    {
      studentFirstName: params.studentFirstName,
      examDate: params.examDate,
      totalCheckIns: aggregates.totalCheckIns,
      respondedCount: aggregates.respondedCount,
      missedCount: aggregates.missedCount,
      avgScore: aggregates.avgScore,
      streak,
      weekNumber,
      weakAreas: aggregates.weakAreas,
      coveredTopics: aggregates.coveredTopics,
      plannedChapters,
    },
    params.aiModel
  );

  const weekStartKey = getEasternWeekStart(params.weekStart);

  const review = await prisma.weeklyReview.upsert({
    where: {
      enrollmentId_weekStartDate: {
        enrollmentId: params.enrollmentId,
        weekStartDate: weekStartKey,
      },
    },
    create: {
      enrollmentId: params.enrollmentId,
      weekStartDate: weekStartKey,
      score: aggregates.avgScore,
      responseRate: aggregates.responseRate,
      weakAreas: aggregates.weakAreas as unknown as object,
      coveredTopics: aggregates.coveredTopics as unknown as object,
      summaryMarkdown,
    },
    update: {
      score: aggregates.avgScore,
      responseRate: aggregates.responseRate,
      weakAreas: aggregates.weakAreas as unknown as object,
      coveredTopics: aggregates.coveredTopics as unknown as object,
      summaryMarkdown,
    },
  });

  return {
    reviewId: review.id,
    planId: planRow?.id ?? review.id,
    summaryMarkdown,
    aggregates,
    streak,
    plannedChapters,
  };
}

async function weekNumberSinceEnrollment(
  enrollmentId: string,
  weekStart: Date
): Promise<number> {
  const e = await prisma.accompagnementEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { createdAt: true },
  });
  if (!e) return 1;
  const diffMs = weekStart.getTime() - e.createdAt.getTime();
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 3600 * 1000)));
}
