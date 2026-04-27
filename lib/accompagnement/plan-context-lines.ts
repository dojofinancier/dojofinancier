/**
 * Plan-aware context lines for daily check-ins (French, tutoiement).
 * Two pools: soft reminders vs accountability prompts (~1 in 5 days).
 */

import type { StudyPlanHorizonV1 } from "./study-plan";
type UnitTerm = "chapitre" | "élément";

function hashDay(enrollmentId: string, ymd: string): number {
  const s = `${enrollmentId}:${ymd}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function toStudentUnitNumber(internalChapter: number): number {
  return Number.isFinite(internalChapter)
    ? Math.max(1, Math.trunc(internalChapter) + 1)
    : 1;
}

function formatChapters(chapters: number[]): string {
  const display = chapters.map(toStudentUnitNumber);
  const uniqueDisplay = Array.from(new Set(display));
  if (uniqueDisplay.length === 0) return "";
  if (uniqueDisplay.length === 1) return `${uniqueDisplay[0]}`;
  if (uniqueDisplay.length === 2) return `${uniqueDisplay[0]} et ${uniqueDisplay[1]}`;
  if (chapters.length === 0) return "";
  return `${uniqueDisplay.slice(0, -1).join(", ")} et ${uniqueDisplay[uniqueDisplay.length - 1]}`;
}

const ACCOUNTABILITY_TEMPLATES: ((ch: number) => string)[] = [
  (ch) => `As-tu fait la révision de ${withDefiniteArticleSingular("élément")} ${toStudentUnitNumber(ch)} ?`,
  (ch) =>
    `As-tu commencé ${withDefiniteArticleSingular("élément")} prévu cette semaine (${withBareUnit("élément")} ${toStudentUnitNumber(ch)}) ?`,
  (ch) =>
    `Où en es-tu avec ${withDefiniteArticleSingular("élément")} ${toStudentUnitNumber(ch)} : commencé, partiellement fait, ou terminé ?`,
];

const SOFT_TEMPLATES: ((ch: number, multi: string) => string)[] = [
  (ch) => `Aujourd'hui, ton focus est ${withDefiniteArticleSingular("élément")} ${toStudentUnitNumber(ch)}.`,
  (ch) => `Petit suivi lié à ${withDefiniteArticleSingular("élément")} ${toStudentUnitNumber(ch)}.`,
  (_ch, multi) => `Cette semaine, l'accent est mis sur les ${withPluralUnit("élément")} ${multi}.`,
];

function withDefiniteArticleSingular(unit: UnitTerm): string {
  return unit === "élément" ? "l'élément" : "le chapitre";
}

function withBareUnit(unit: UnitTerm): string {
  return unit;
}

function withPluralUnit(unit: UnitTerm): string {
  return unit === "élément" ? "éléments" : "chapitres";
}

function renderTemplateForUnit(
  template: (ch: number, multi: string) => string,
  unit: UnitTerm,
  ch: number,
  multi: string
): string {
  return template(ch, multi)
    .replaceAll("l'élément", withDefiniteArticleSingular(unit))
    .replaceAll("le chapitre", withDefiniteArticleSingular(unit))
    .replaceAll("élément", withBareUnit(unit))
    .replaceAll("éléments", withPluralUnit(unit));
}

export function pickPlanAwareContextLine(params: {
  enrollmentId: string;
  /** YYYY-MM-DD Eastern or local server date — caller should pass ET date string */
  dateKey: string;
  plannedChapters: number[];
  unitTerm?: UnitTerm;
}): { body: string; key: string } | null {
  const { enrollmentId, dateKey, plannedChapters } = params;
  const unitTerm = params.unitTerm ?? "élément";
  if (plannedChapters.length === 0) return null;

  const h = hashDay(enrollmentId, dateKey);
  const accountability = h % 5 === 0;

  const ch = plannedChapters[h % plannedChapters.length];
  const multi = formatChapters(plannedChapters);

  if (accountability) {
    const tpl = ACCOUNTABILITY_TEMPLATES[h % ACCOUNTABILITY_TEMPLATES.length];
    return {
      body: renderTemplateForUnit(tpl, unitTerm, ch, multi),
      key: `plan:accountability:${dateKey}:${h % ACCOUNTABILITY_TEMPLATES.length}`,
    };
  }

  const softIdx = h % SOFT_TEMPLATES.length;
  if (plannedChapters.length >= 2 && softIdx === 2) {
    return {
      body: renderTemplateForUnit(SOFT_TEMPLATES[2], unitTerm, ch, multi),
      key: `plan:soft:week:${dateKey}`,
    };
  }
  const tpl = SOFT_TEMPLATES[softIdx % 2];
  return {
    body: renderTemplateForUnit(tpl, unitTerm, ch, multi),
    key: `plan:soft:${softIdx}:${dateKey}`,
  };
}

/** Extract current week planned chapters from stored horizon (version 1). */
export function plannedChaptersFromHorizon(
  horizon: unknown,
  now: Date = new Date()
): number[] {
  if (!horizon || typeof horizon !== "object") return [];
  const h = horizon as StudyPlanHorizonV1;
  if (h.version !== 1 || !Array.isArray(h.weeks)) return [];
  const t = now.getTime();
  const week =
    h.weeks.find((w) => {
      const ws = new Date(w.weekStart).getTime();
      const we = new Date(w.weekEnd).getTime();
      return t >= ws && t <= we;
    }) ?? h.weeks[0];
  if (!week) return [];
  return week.plannedChapterNumbers?.length
    ? week.plannedChapterNumbers
    : week.selectedChapters.map((s) => s.chapter);
}
