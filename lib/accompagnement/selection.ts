/**
 * Rules-based question selection for Accompagnement check-ins.
 *
 * Priority order (PRD §8.4):
 *   1. currently planned chapters (current WeeklyPlan)
 *   2. weak areas (WeakAreaSignal rows last 30 days)
 *   3. recently studied chapters (CheckInAnswer rows last 14 days)
 *   4. broader course pool (fallback)
 *
 * Weekly 20-MCQ (PRD §8.5): 50% recent, 30% weak, 20% broader.
 *
 * Every query filters on:
 *   - course = courses.slug
 *   - status = 'approved'
 *   - language = 'fr'
 *
 * Repetition avoidance: excludes question ids already served to the
 * enrollment within a trailing window (14 days for light/mid, 30 days
 * for weekly). Falls back to broader pool when filtered set is empty.
 *
 * NOTE: until the adaptive bank is retagged, we ignore `format_use`.
 */

import { CheckInType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEasternWeekStart } from "@/lib/accompagnement/schedule";
import type {
  AdaptiveMcqRow,
  AdaptiveOeqRow,
  PickedQuestions,
  SelectionContext,
} from "./types";
import { CHECKIN_SHAPE } from "./types";

const APPROVED_STATUS = "approved";
const LANGUAGE = "fr";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, Math.max(0, n));
}

// ─── Low-level fetchers ──────────────────────────────────────────────────────

async function fetchMcqs(opts: {
  courseSlug: string;
  chapters?: number[] | null;
  excludeIds: string[];
  limit: number;
}): Promise<AdaptiveMcqRow[]> {
  const where: Prisma.AdaptiveMcqWhereInput = {
    course: opts.courseSlug,
    status: APPROVED_STATUS,
    language: LANGUAGE,
    ...(opts.chapters && opts.chapters.length > 0
      ? { chapter: { in: opts.chapters } }
      : {}),
    ...(opts.excludeIds.length > 0
      ? { id: { notIn: opts.excludeIds } }
      : {}),
  };

  const rows = await prisma.adaptiveMcq.findMany({
    where,
    orderBy: { createdAt: "desc" },
    // Overfetch so we can shuffle and pick without a huge table scan
    take: Math.max(opts.limit * 5, 40),
    select: {
      id: true,
      questionId: true,
      course: true,
      chapter: true,
      topic: true,
      difficulty: true,
      questionText: true,
      options: true,
      correctAnswer: true,
      explanation: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    questionId: r.questionId,
    course: r.course,
    chapter: r.chapter,
    topic: r.topic,
    difficulty: r.difficulty,
    questionText: r.questionText,
    options: (r.options as Record<string, string>) ?? {},
    correctAnswer: r.correctAnswer,
    explanation: r.explanation,
  }));
}

async function fetchOeqs(opts: {
  courseSlug: string;
  chapters?: number[] | null;
  excludeIds: string[];
  limit: number;
}): Promise<AdaptiveOeqRow[]> {
  const where: Prisma.AdaptiveOeqWhereInput = {
    course: opts.courseSlug,
    status: APPROVED_STATUS,
    language: LANGUAGE,
    ...(opts.chapters && opts.chapters.length > 0
      ? { chapter: { in: opts.chapters } }
      : {}),
    ...(opts.excludeIds.length > 0
      ? { id: { notIn: opts.excludeIds } }
      : {}),
  };

  const rows = await prisma.adaptiveOeq.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.max(opts.limit * 5, 40),
    select: {
      id: true,
      questionId: true,
      course: true,
      chapter: true,
      topic: true,
      difficulty: true,
      questionText: true,
      modelAnswer: true,
      explanation: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    questionId: r.questionId,
    course: r.course,
    chapter: r.chapter,
    topic: r.topic,
    difficulty: r.difficulty,
    questionText: r.questionText,
    modelAnswer: r.modelAnswer,
    explanation: r.explanation,
  }));
}

// ─── Context builder ─────────────────────────────────────────────────────────

export async function buildSelectionContext(
  enrollmentId: string,
  courseSlug: string
): Promise<SelectionContext> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  // Current Eastern week row (not "latest row", which may be a simulated future week)
  const weekStart = getEasternWeekStart(now);
  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      enrollmentId_weekStartDate: { enrollmentId, weekStartDate: weekStart },
    },
  });
  const plannedChapters = Array.isArray(plan?.plannedChapters)
    ? (plan!.plannedChapters as unknown as number[]).filter(
        (n) => typeof n === "number"
      )
    : [];

  // Weak areas: chapters with any signal in the last 30 days
  const weakSignals = await prisma.weakAreaSignal.findMany({
    where: { enrollmentId, createdAt: { gte: thirtyDaysAgo } },
    select: { chapter: true },
    distinct: ["chapter"],
  });
  const weakAreaChapters = weakSignals.map((w) => w.chapter);

  // Recent chapters: from check-in answers last 14 days
  const recentAnswers = await prisma.checkInAnswer.findMany({
    where: {
      checkIn: { enrollmentId },
      createdAt: { gte: fourteenDaysAgo },
    },
    select: {
      adaptiveChapter: true,
      adaptiveQuestionId: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const recentChapters = Array.from(
    new Set(recentAnswers.map((r) => r.adaptiveChapter))
  );
  const recentAdaptiveQuestionIds = Array.from(
    new Set(recentAnswers.map((r) => r.adaptiveQuestionId))
  );

  return {
    enrollmentId,
    courseSlug,
    plannedChapters,
    weakAreaChapters,
    recentChapters,
    recentAdaptiveQuestionIds,
  };
}

// ─── MCQ priority picker ─────────────────────────────────────────────────────

/**
 * Picks MCQs following priority order:
 *   planned > weak > recent > broader
 * Then de-dupes and trims to the requested size.
 */
async function pickMcqsByPriority(
  ctx: SelectionContext,
  count: number
): Promise<AdaptiveMcqRow[]> {
  if (count <= 0) return [];
  const exclude = [...ctx.recentAdaptiveQuestionIds];
  const picked: AdaptiveMcqRow[] = [];

  const tryPool = async (chapters: number[] | null) => {
    if (picked.length >= count) return;
    const need = count - picked.length;
    const rows = await fetchMcqs({
      courseSlug: ctx.courseSlug,
      chapters,
      excludeIds: exclude,
      limit: need * 3,
    });
    const fresh = uniqueById(rows).filter(
      (r) => !picked.some((p) => p.id === r.id)
    );
    const shuffled = shuffle(fresh);
    for (const row of shuffled) {
      if (picked.length >= count) break;
      picked.push(row);
      exclude.push(row.id);
    }
  };

  if (ctx.plannedChapters.length) await tryPool(ctx.plannedChapters);
  if (ctx.weakAreaChapters.length) await tryPool(ctx.weakAreaChapters);
  if (ctx.recentChapters.length) await tryPool(ctx.recentChapters);
  await tryPool(null); // broader pool

  // Last-resort: if still short, allow recently-seen questions
  if (picked.length < count) {
    const rows = await fetchMcqs({
      courseSlug: ctx.courseSlug,
      chapters: null,
      excludeIds: picked.map((p) => p.id),
      limit: (count - picked.length) * 2,
    });
    for (const row of shuffle(rows)) {
      if (picked.length >= count) break;
      picked.push(row);
    }
  }

  return picked.slice(0, count);
}

// ─── Weekly 20-MCQ weighted picker (PRD §8.5) ────────────────────────────────

async function pickWeeklyMcqs(ctx: SelectionContext): Promise<AdaptiveMcqRow[]> {
  const TOTAL = 20;
  const RECENT_N = 10; // 50%
  const WEAK_N = 6; // 30%
  const BROADER_N = TOTAL - RECENT_N - WEAK_N; // 20%

  // For weekly, use a 30-day recent window (stricter)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const wideRecent = await prisma.checkInAnswer.findMany({
    where: {
      checkIn: { enrollmentId: ctx.enrollmentId },
      createdAt: { gte: thirtyDaysAgo },
      source: "MCQ",
    },
    select: { adaptiveQuestionId: true },
    take: 500,
  });
  const exclude = Array.from(new Set(wideRecent.map((r) => r.adaptiveQuestionId)));

  const picked: AdaptiveMcqRow[] = [];

  const pullFrom = async (chapters: number[] | null, count: number) => {
    if (count <= 0) return;
    const rows = await fetchMcqs({
      courseSlug: ctx.courseSlug,
      chapters,
      excludeIds: [...exclude, ...picked.map((p) => p.id)],
      limit: count * 3,
    });
    const fresh = uniqueById(rows).filter(
      (r) => !picked.some((p) => p.id === r.id)
    );
    const shuffled = shuffle(fresh);
    for (const row of shuffled) {
      if (picked.length >= TOTAL) return;
      const bucketSize = count - (picked.length - (TOTAL - count));
      if (bucketSize <= 0) return;
      picked.push(row);
    }
  };

  // 50% recent chapters
  await pullFrom(
    ctx.recentChapters.length ? ctx.recentChapters : null,
    RECENT_N
  );

  // 30% weak area chapters
  const weakTarget =
    WEAK_N - Math.max(0, picked.length - RECENT_N) >= 0
      ? WEAK_N - Math.max(0, picked.length - RECENT_N)
      : WEAK_N;
  await pullFrom(
    ctx.weakAreaChapters.length ? ctx.weakAreaChapters : null,
    weakTarget
  );

  // 20% broader pool
  await pullFrom(null, TOTAL - picked.length);

  // Relaxed fallback if still short
  if (picked.length < TOTAL) {
    const rows = await fetchMcqs({
      courseSlug: ctx.courseSlug,
      chapters: null,
      excludeIds: picked.map((p) => p.id),
      limit: (TOTAL - picked.length) * 2,
    });
    for (const row of shuffle(rows)) {
      if (picked.length >= TOTAL) break;
      picked.push(row);
    }
  }

  return picked.slice(0, TOTAL);
}

// ─── OEQ picker ──────────────────────────────────────────────────────────────

async function pickOeqsByPriority(
  ctx: SelectionContext,
  count: number
): Promise<AdaptiveOeqRow[]> {
  if (count <= 0) return [];
  const exclude = [...ctx.recentAdaptiveQuestionIds];
  const picked: AdaptiveOeqRow[] = [];

  const tryPool = async (chapters: number[] | null) => {
    if (picked.length >= count) return;
    const need = count - picked.length;
    const rows = await fetchOeqs({
      courseSlug: ctx.courseSlug,
      chapters,
      excludeIds: exclude,
      limit: need * 3,
    });
    const fresh = uniqueById(rows).filter(
      (r) => !picked.some((p) => p.id === r.id)
    );
    for (const row of shuffle(fresh)) {
      if (picked.length >= count) break;
      picked.push(row);
      exclude.push(row.id);
    }
  };

  if (ctx.plannedChapters.length) await tryPool(ctx.plannedChapters);
  if (ctx.weakAreaChapters.length) await tryPool(ctx.weakAreaChapters);
  if (ctx.recentChapters.length) await tryPool(ctx.recentChapters);
  await tryPool(null);

  if (picked.length < count) {
    const rows = await fetchOeqs({
      courseSlug: ctx.courseSlug,
      chapters: null,
      excludeIds: picked.map((p) => p.id),
      limit: (count - picked.length) * 2,
    });
    for (const row of shuffle(rows)) {
      if (picked.length >= count) break;
      picked.push(row);
    }
  }

  return picked.slice(0, count);
}

// ─── Public entry point ──────────────────────────────────────────────────────

export async function pickQuestionsForCheckIn(params: {
  enrollmentId: string;
  courseSlug: string;
  type: CheckInType;
}): Promise<PickedQuestions> {
  const shape = CHECKIN_SHAPE[params.type];
  const ctx = await buildSelectionContext(
    params.enrollmentId,
    params.courseSlug
  );

  if (params.type === "WEEKLY") {
    const mcqs = await pickWeeklyMcqs(ctx);
    return { mcqs, oeqs: [] };
  }

  const [mcqs, oeqs] = await Promise.all([
    pickMcqsByPriority(ctx, shape.mcqCount),
    pickOeqsByPriority(ctx, shape.oeqCount),
  ]);

  return { mcqs, oeqs };
}
