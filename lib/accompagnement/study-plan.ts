/**
 * Accompagnement chapter-level study plan (spec: study_plan_accompagnement.md).
 * Independent from main product DailyPlanEntry. Produces a stored horizon JSON
 * + WeeklyPlan row for the current Eastern week.
 */

import type { ChapterAssessmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEasternWeekStart } from "@/lib/accompagnement/schedule";

const COVERAGE_MIN_MCQ = 10;
const COVERAGE_MIN_SCORE_PCT = 70;
const WRONG_MCQ_THRESHOLD = 3;
const REINFORCEMENT_EXIT_CORRECT_MCQ = 5;

export type PlanFeasibility = "on_track" | "tight" | "at_risk" | "unrealistic";
export type PlanPhase = "apprendre" | "réviser" | "pratiquer";
export type ChapterLogicalState =
  | "not_started"
  | "covered_once"
  | "needs_reinforcement"
  | "stable";

export type PlanModality = "apprendre" | "réviser" | "pratiquer" | "renforcer";

export interface SelectedChapterDetail {
  chapter: number;
  primaryModality: PlanModality;
  secondaryModality: PlanModality;
  reason: string;
}

export interface HorizonWeekV1 {
  weekStart: string;
  weekEnd: string;
  planStatus: PlanFeasibility;
  phase: PlanPhase;
  estimatedHours: number;
  weeklyGoalSummary: string;
  selectedChapters: SelectedChapterDetail[];
  plannedChapterNumbers: number[];
  isSimulated: boolean;
}

export interface StudyPlanHorizonV1 {
  version: 1;
  generatedAt: string;
  globalPlanStatus: PlanFeasibility;
  globalPhase: PlanPhase;
  compressedMode: boolean;
  weeks: HorizonWeekV1[];
}

/** Safe parse for JSON stored on `AccompagnementEnrollment.studyPlanHorizon`. */
export function parseStudyPlanHorizonJson(
  raw: unknown
): StudyPlanHorizonV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.weeks)) return null;
  return raw as StudyPlanHorizonV1;
}

interface ChapterRuntime {
  order: number;
  selfStatus: ChapterAssessmentStatus | null;
  mcqTotal: number;
  mcqCorrect: number;
  mcqWrong: number;
  /** Latest student confirmation from any WeeklyPlan row */
  confirmation: "COMPLETED" | "PARTIAL" | "NOT_COMPLETED" | null;
  logical: ChapterLogicalState;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function endOfWeekSundayStart(weekStart: Date): Date {
  const e = new Date(weekStart);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function weeksBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)));
}

function scorePct(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

function deriveLogicalState(c: ChapterRuntime): ChapterLogicalState {
  const pct = scorePct(c.mcqCorrect, c.mcqTotal);

  if (c.confirmation === "COMPLETED") {
    return c.mcqWrong === 0 && pct >= 80 ? "stable" : "covered_once";
  }

  const lowSelf =
    c.selfStatus === "NOT_STARTED" || c.selfStatus === "READ_LOW";
  const manyWrong = c.mcqWrong >= WRONG_MCQ_THRESHOLD;
  const inReinforcement = lowSelf || manyWrong;

  if (inReinforcement) {
    const canExit =
      c.mcqCorrect >= REINFORCEMENT_EXIT_CORRECT_MCQ &&
      c.mcqWrong < WRONG_MCQ_THRESHOLD;
    if (!canExit) return "needs_reinforcement";
  }

  if (c.mcqTotal >= COVERAGE_MIN_MCQ && pct >= COVERAGE_MIN_SCORE_PCT) {
    return c.mcqWrong === 0 ? "stable" : "covered_once";
  }

  if (c.selfStatus === "READ_CONFIDENT") return "covered_once";

  return "not_started";
}

function computeFeasibility(params: {
  weeksRemaining: number;
  uncoveredCount: number;
  weakCount: number;
  studyHoursPerWeek: number;
  compressedMode: boolean;
}): PlanFeasibility {
  const { weeksRemaining, uncoveredCount, weakCount, studyHoursPerWeek, compressedMode } =
    params;
  const slotsPerWeek = Math.min(3, Math.max(1, Math.round(studyHoursPerWeek / 5)));
  const capacity = weeksRemaining * slotsPerWeek;
  const demand = uncoveredCount + Math.ceil(weakCount * (compressedMode ? 0.35 : 0.5));

  if (demand > capacity * 1.35) return "unrealistic";
  if (demand > capacity * 1.05) return "at_risk";
  if (demand > capacity * 0.85) return "tight";
  return "on_track";
}

function globalPhaseFromChapters(chapters: ChapterRuntime[]): PlanPhase {
  if (chapters.some((c) => c.logical === "not_started")) return "apprendre";
  if (chapters.some((c) => c.logical === "needs_reinforcement")) return "réviser";
  return "pratiquer";
}

function assignModalities(
  c: ChapterRuntime,
  phase: PlanPhase
): { primary: PlanModality; secondary: PlanModality; reason: string } {
  const ch = c.order;
  if (c.logical === "needs_reinforcement") {
    return {
      primary: "renforcer",
      secondary: "pratiquer",
      reason: "Points à consolider sur ce chapitre (erreurs ou faible confiance).",
    };
  }
  if (c.logical === "not_started" || (c.logical === "covered_once" && phase === "apprendre")) {
    return {
      primary: "apprendre",
      secondary: "réviser",
      reason: "Priorité de couverture — avance sur ce chapitre.",
    };
  }
  if (phase === "réviser") {
    return {
      primary: "réviser",
      secondary: "pratiquer",
      reason: "Consolidation et révision active.",
    };
  }
  return {
    primary: "pratiquer",
    secondary: c.logical === "stable" ? "réviser" : "renforcer",
    reason: "Entraînement et mise en situation.",
  };
}

function rankChapters(
  chapters: ChapterRuntime[],
  phase: PlanPhase,
  compressedMode: boolean
): ChapterRuntime[] {
  const scored = chapters.map((c) => {
    let priority = c.order;
    if (c.logical === "not_started") priority -= 1000;
    else if (c.logical === "needs_reinforcement") priority -= 700;
    else if (c.logical === "covered_once" && phase !== "apprendre")
      priority -= 400;
    else if (c.logical === "stable") priority -= 200;
    if (compressedMode && c.logical === "not_started") priority -= 50;
    if (c.selfStatus === "READ_LOW" || c.selfStatus === "NOT_STARTED")
      priority -= 15;
    return { c, priority };
  });
  scored.sort((a, b) => a.priority - b.priority);
  return scored.map((s) => s.c);
}

function buildWeeklySummary(
  phase: PlanPhase,
  selected: SelectedChapterDetail[],
  feasibility: PlanFeasibility,
  compressedMode: boolean
): string {
  const ch = selected.map((s) => s.chapter).join(", ");
  let base = "";
  if (selected.length === 0) {
    base = "Maintiens ton rythme — on ajuste le plan après tes prochains suivis.";
  } else if (phase === "apprendre") {
    base = `Cette semaine, avance sur ${selected.length <= 1 ? "le chapitre" : "les chapitres"} ${ch}.`;
  } else if (phase === "réviser") {
    base = `On consolide : chapitres ${ch}.`;
  } else {
    base = `Pratique ciblée sur ${ch}.`;
  }
  if (compressedMode) {
    base += " Mode intensive : on priorise la couverture globale.";
  }
  if (feasibility === "unrealistic") {
    base += " Échéancier très serré — enlève du stress en éloignant l’examen ou en augmentant un peu tes heures.";
  } else if (feasibility === "at_risk") {
    base += " Ton planning est juste : chaque session compte.";
  }
  return base;
}

async function loadAnswerStatsByChapter(
  enrollmentId: string,
  courseSlug: string
): Promise<Map<number, { total: number; correct: number; wrong: number }>> {
  const rows = await prisma.checkInAnswer.groupBy({
    by: ["adaptiveChapter", "isCorrect", "source"],
    where: {
      checkIn: { enrollmentId },
      adaptiveCourse: courseSlug,
      source: "MCQ",
    },
    _count: { id: true },
  });
  const map = new Map<number, { total: number; correct: number; wrong: number }>();
  for (const r of rows) {
    const ch = r.adaptiveChapter;
    if (!map.has(ch)) map.set(ch, { total: 0, correct: 0, wrong: 0 });
    const m = map.get(ch)!;
    const n = r._count.id;
    m.total += n;
    if (r.isCorrect === true) m.correct += n;
    if (r.isCorrect === false) m.wrong += n;
  }
  return map;
}

async function loadConfirmationMap(
  enrollmentId: string
): Promise<Map<number, "COMPLETED" | "PARTIAL" | "NOT_COMPLETED">> {
  const plans = await prisma.weeklyPlan.findMany({
    where: { enrollmentId },
    select: { chapterConfirmations: true, weekStartDate: true, updatedAt: true },
    orderBy: { weekStartDate: "asc" },
  });
  const out = new Map<number, "COMPLETED" | "PARTIAL" | "NOT_COMPLETED">();
  for (const p of plans) {
    const raw = p.chapterConfirmations;
    if (!raw || !Array.isArray(raw)) continue;
    for (const entry of raw as { chapter?: number; status?: string }[]) {
      if (typeof entry.chapter !== "number") continue;
      if (
        entry.status === "COMPLETED" ||
        entry.status === "PARTIAL" ||
        entry.status === "NOT_COMPLETED"
      ) {
        out.set(entry.chapter, entry.status);
      }
    }
  }
  return out;
}

/**
 * Rebuilds horizon JSON + upserts WeeklyPlan for the current Eastern week.
 */
export async function regenerateAccompagnementStudyPlan(
  enrollmentId: string,
  now: Date = new Date()
): Promise<{ horizon: StudyPlanHorizonV1 | null; error?: string }> {
  const enrollment = await prisma.accompagnementEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      onboarding: {
        include: { chapterAssessments: true },
      },
      product: {
        include: {
          course: {
            select: {
              slug: true,
              modules: { select: { order: true }, orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!enrollment?.onboardingCompleted) {
    return { horizon: null, error: "Onboarding incomplet" };
  }

  const courseSlug = enrollment.product.course.slug;
  if (!courseSlug) {
    return { horizon: null, error: "Cours sans identifiant (slug)" };
  }
  const moduleOrders = enrollment.product.course.modules.map((m) => m.order);
  if (moduleOrders.length === 0) {
    return { horizon: null, error: "Aucun chapitre (module) pour ce cours" };
  }

  const examDate = enrollment.onboarding?.examDate;
  const studyHoursPerWeek = enrollment.onboarding?.studyHoursPerWeek ?? 6;
  const selfByChapter = new Map(
    enrollment.onboarding?.chapterAssessments.map((a) => [a.chapter, a.status]) ??
      []
  );
  const answerStats = await loadAnswerStatsByChapter(enrollmentId, courseSlug);
  const confirmations = await loadConfirmationMap(enrollmentId);

  let runtimes: ChapterRuntime[] = moduleOrders.map((order) => {
    const st = answerStats.get(order) ?? { total: 0, correct: 0, wrong: 0 };
    const conf = confirmations.get(order) ?? null;
    return {
      order,
      selfStatus: selfByChapter.get(order) ?? null,
      mcqTotal: st.total,
      mcqCorrect: st.correct,
      mcqWrong: st.wrong,
      confirmation: conf,
      logical: "not_started",
    };
  });

  for (const c of runtimes) {
    c.logical = deriveLogicalState(c);
  }

  const weeksRemaining = examDate
    ? weeksBetween(now, examDate)
    : Math.max(8, 12);
  const uncoveredCount = runtimes.filter(
    (c) => c.logical === "not_started"
  ).length;
  const weakCount = runtimes.filter(
    (c) => c.logical === "needs_reinforcement"
  ).length;

  const compressedMode = enrollment.compressedMode;
  const globalPlanStatusWithoutCompression = computeFeasibility({
    weeksRemaining,
    uncoveredCount,
    weakCount,
    studyHoursPerWeek,
    compressedMode: false,
  });

  let globalPlanStatus = computeFeasibility({
    weeksRemaining,
    uncoveredCount,
    weakCount,
    studyHoursPerWeek,
    compressedMode,
  });

  if (!examDate) {
    globalPlanStatus = "on_track";
  }

  /** Drop triage only when date/hours/progress make the plan non-unrealistic *without* compression. */
  const scheduleRealisticWithoutCompression =
    !examDate || globalPlanStatusWithoutCompression !== "unrealistic";

  let globalPhase = globalPhaseFromChapters(runtimes);

  const horizonWeeks: HorizonWeekV1[] = [];
  let sim = runtimes.map((r) => ({ ...r }));

  if (!examDate) {
    const weekStart = getEasternWeekStart(now);
    const ranked = rankChapters(sim, globalPhase, compressedMode);
    const pick = ranked.slice(0, 3);
    const selected: SelectedChapterDetail[] = pick.map((c) => {
      const m = assignModalities(c, globalPhase);
      return {
        chapter: c.order,
        primaryModality: m.primary,
        secondaryModality: m.secondary,
        reason: m.reason,
      };
    });
    const feasibility = globalPlanStatus;
    horizonWeeks.push({
      weekStart: weekStart.toISOString(),
      weekEnd: endOfWeekSundayStart(weekStart).toISOString(),
      planStatus: feasibility,
      phase: globalPhase,
      estimatedHours: studyHoursPerWeek,
      weeklyGoalSummary: buildWeeklySummary(globalPhase, selected, feasibility, compressedMode),
      selectedChapters: selected,
      plannedChapterNumbers: selected.map((s) => s.chapter),
      isSimulated: false,
    });
  } else {
    let cursor = getEasternWeekStart(now);
    const exam = new Date(examDate);
    exam.setHours(23, 59, 59, 999);
    let weekIndex = 0;
    while (cursor.getTime() <= exam.getTime() && weekIndex < 52) {
      const ranked = rankChapters(sim, globalPhase, compressedMode);
      const pick = ranked.slice(0, 3);
      const selected: SelectedChapterDetail[] = pick.map((c) => {
        const m = assignModalities(c, globalPhase);
        return {
          chapter: c.order,
          primaryModality: m.primary,
          secondaryModality: m.secondary,
          reason: m.reason,
        };
      });
      const weekFeasibility = computeFeasibility({
        weeksRemaining: weeksBetween(cursor, exam),
        uncoveredCount: sim.filter((c) => c.logical === "not_started").length,
        weakCount: sim.filter((c) => c.logical === "needs_reinforcement").length,
        studyHoursPerWeek,
        compressedMode,
      });

      const phaseThisWeek =
        weekIndex === 0 ? globalPhase : globalPhaseFromChapters(sim);

      horizonWeeks.push({
        weekStart: cursor.toISOString(),
        weekEnd: endOfWeekSundayStart(cursor).toISOString(),
        planStatus: weekFeasibility,
        phase: phaseThisWeek,
        estimatedHours: studyHoursPerWeek,
        weeklyGoalSummary: buildWeeklySummary(
          phaseThisWeek,
          selected,
          weekFeasibility,
          compressedMode
        ),
        selectedChapters: selected,
        plannedChapterNumbers: selected.map((s) => s.chapter),
        isSimulated: weekIndex > 0,
      });

      for (const ch of pick) {
        const s = sim.find((x) => x.order === ch.order);
        if (s) {
          if (s.logical === "not_started") s.logical = "covered_once";
          else if (s.logical === "needs_reinforcement") s.logical = "covered_once";
        }
      }
      globalPhase = globalPhaseFromChapters(sim);

      cursor = addDays(cursor, 7);
      weekIndex++;
    }
  }

  const horizon: StudyPlanHorizonV1 = {
    version: 1,
    generatedAt: now.toISOString(),
    globalPlanStatus,
    globalPhase,
    compressedMode,
    weeks: horizonWeeks,
  };

  const currentWeekStart = getEasternWeekStart(now);
  const currentSlice =
    horizonWeeks.find((w) => {
      const ws = new Date(w.weekStart).getTime();
      const we = new Date(w.weekEnd).getTime();
      const t = now.getTime();
      return t >= ws && t <= we;
    }) ?? horizonWeeks[0];

  if (currentSlice) {
    await prisma.weeklyPlan.upsert({
      where: {
        enrollmentId_weekStartDate: {
          enrollmentId,
          weekStartDate: currentWeekStart,
        },
      },
      create: {
        enrollmentId,
        weekStartDate: currentWeekStart,
        plannedChapters: currentSlice.plannedChapterNumbers as unknown as object,
        focusTopics: currentSlice.selectedChapters.map(
          (s) => `Ch. ${s.chapter} (${s.primaryModality})`
        ) as unknown as object,
        phase: currentSlice.phase,
        planStatus: currentSlice.planStatus,
        weeklyGoalSummary: currentSlice.weeklyGoalSummary,
        selectedChaptersDetail: currentSlice.selectedChapters as unknown as object,
        estimatedHours: currentSlice.estimatedHours,
      },
      update: {
        plannedChapters: currentSlice.plannedChapterNumbers as unknown as object,
        focusTopics: currentSlice.selectedChapters.map(
          (s) => `Ch. ${s.chapter} (${s.primaryModality})`
        ) as unknown as object,
        phase: currentSlice.phase,
        planStatus: currentSlice.planStatus,
        weeklyGoalSummary: currentSlice.weeklyGoalSummary,
        selectedChaptersDetail: currentSlice.selectedChapters as unknown as object,
        estimatedHours: currentSlice.estimatedHours,
      },
    });
  }

  await prisma.accompagnementEnrollment.update({
    where: { id: enrollmentId },
    data: {
      studyPlanHorizon: horizon as unknown as object,
      studyPlanGeneratedAt: now,
      ...(scheduleRealisticWithoutCompression
        ? { compressedMode: false, ackUnrealisticSchedule: false }
        : {}),
    },
  });

  return { horizon };
}
