import { ContextLineCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Built-in fallback context lines (French) used when the admin has not seeded
 * a `ContextLineTemplate` for a given category. Picked deterministically per
 * (enrollment, weekday) to avoid repetition.
 */
const FALLBACK_LINES: Record<ContextLineCategory, string[]> = {
  NORMAL: [
    "Un petit suivi quotidien pour garder le rythme. Prêt pour aujourd'hui ?",
    "On reprend doucement là où vous vous êtes arrêté.",
    "Quelques minutes pour consolider vos acquis du jour.",
  ],
  WEAK_AREA: [
    "On revient sur un point à renforcer — c'est là que vous allez gagner le plus.",
    "Un chapitre que vous avez trouvé moins solide : parfait pour aujourd'hui.",
  ],
  MISSED_ACK: [
    "Pas de souci d'avoir manqué hier. On repart avec quelque chose de simple.",
    "On reprend ensemble, doucement — juste une question et une intention.",
  ],
  PLAN_REMINDER: [
    "Un rappel de votre plan de la semaine. On avance par petites étapes.",
    "On reste sur les chapitres prévus cette semaine.",
  ],
  EXAM_URGENCY: [
    "L'examen approche. Chaque session compte — on y va.",
    "On garde le cap vers l'examen : une répétition bien faite vaut de l'or.",
  ],
};

/**
 * Returns a `{ body, key }` pair for a context line. The key is a stable
 * identifier (template id, or `fallback:CATEGORY:IDX`) that can be stored on
 * the DailyCheckIn for observability/repetition tracking.
 */
export async function pickContextLine(params: {
  category: ContextLineCategory;
  weekday: number; // 0 = Sun ... 6 = Sat (ET)
  enrollmentId: string;
}): Promise<{ body: string; key: string }> {
  // 1. Try active admin templates for this category matching the weekday.
  const templates = await prisma.contextLineTemplate.findMany({
    where: {
      category: params.category,
      active: true,
    },
    select: {
      id: true,
      body: true,
      weekdayApplicability: true,
    },
  });

  const applicable = templates.filter((t) => {
    const days = Array.isArray(t.weekdayApplicability)
      ? (t.weekdayApplicability as number[]).filter(
          (n) => typeof n === "number"
        )
      : [];
    return days.length === 0 || days.includes(params.weekday);
  });

  if (applicable.length > 0) {
    const idx = hashToIndex(
      `${params.enrollmentId}:${params.weekday}:${params.category}`,
      applicable.length
    );
    const pick = applicable[idx];
    return { body: pick.body, key: pick.id };
  }

  // 2. Fallback to the built-in list.
  const fallbacks = FALLBACK_LINES[params.category];
  const idx = hashToIndex(
    `${params.enrollmentId}:${params.weekday}:${params.category}`,
    fallbacks.length
  );
  return {
    body: fallbacks[idx],
    key: `fallback:${params.category}:${idx}`,
  };
}

function hashToIndex(input: string, modulo: number): number {
  if (modulo <= 0) return 0;
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
}
