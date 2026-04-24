/**
 * Plan-aware context lines for daily check-ins (French, tutoiement).
 * Two pools: soft reminders vs accountability prompts (~1 in 5 days).
 */

import type { StudyPlanHorizonV1 } from "./study-plan";

function hashDay(enrollmentId: string, ymd: string): number {
  const s = `${enrollmentId}:${ymd}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function formatChapters(chapters: number[]): string {
  if (chapters.length === 0) return "";
  if (chapters.length === 1) return `${chapters[0]}`;
  if (chapters.length === 2) return `${chapters[0]} et ${chapters[1]}`;
  return `${chapters.slice(0, -1).join(", ")} et ${chapters[chapters.length - 1]}`;
}

const ACCOUNTABILITY_TEMPLATES: ((ch: number) => string)[] = [
  (ch) => `As-tu fait la révision du chapitre ${ch} ?`,
  (ch) => `As-tu commencé le chapitre prévu cette semaine (chapitre ${ch}) ?`,
  (ch) =>
    `Où en es-tu avec le chapitre ${ch} : commencé, partiellement fait, ou terminé ?`,
];

const SOFT_TEMPLATES: ((ch: number, multi: string) => string)[] = [
  (ch) => `Aujourd'hui, ton focus est le chapitre ${ch}.`,
  (ch) => `Petit suivi lié au chapitre ${ch}.`,
  (_ch, multi) => `Cette semaine, l'accent est mis sur les chapitres ${multi}.`,
];

export function pickPlanAwareContextLine(params: {
  enrollmentId: string;
  /** YYYY-MM-DD Eastern or local server date — caller should pass ET date string */
  dateKey: string;
  plannedChapters: number[];
}): { body: string; key: string } | null {
  const { enrollmentId, dateKey, plannedChapters } = params;
  if (plannedChapters.length === 0) return null;

  const h = hashDay(enrollmentId, dateKey);
  const accountability = h % 5 === 0;

  const ch = plannedChapters[h % plannedChapters.length];
  const multi = formatChapters(plannedChapters);

  if (accountability) {
    const tpl = ACCOUNTABILITY_TEMPLATES[h % ACCOUNTABILITY_TEMPLATES.length];
    return {
      body: tpl(ch),
      key: `plan:accountability:${dateKey}:${h % ACCOUNTABILITY_TEMPLATES.length}`,
    };
  }

  const softIdx = h % SOFT_TEMPLATES.length;
  if (plannedChapters.length >= 2 && softIdx === 2) {
    return {
      body: SOFT_TEMPLATES[2](ch, multi),
      key: `plan:soft:week:${dateKey}`,
    };
  }
  const tpl = SOFT_TEMPLATES[softIdx % 2];
  return {
    body: tpl(ch, multi),
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
