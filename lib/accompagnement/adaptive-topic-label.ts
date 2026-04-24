/**
 * Map adaptive bank topic codes (e.g. "T5") to student-facing labels using
 * `adaptive_mcq.concept_tested`, which is curated human text in French.
 */

import { prisma } from "@/lib/prisma";

const APPROVED = "approved";
const LANG = "fr";

export async function resolveAdaptiveTopicDisplayLabels(
  courseSlug: string | null | undefined,
  pairs: Array<{ chapter: number; topic: string }>
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const p of pairs) {
    out.set(`${p.chapter}:${p.topic}`, p.topic);
  }

  if (!courseSlug?.trim() || pairs.length === 0) {
    return out;
  }

  const uniquePairs = Array.from(
    new Map(
      pairs.map((p) => [`${p.chapter}:${p.topic}`, p] as const)
    ).values()
  );

  const orClause = uniquePairs.map((p) => ({
    course: courseSlug,
    chapter: p.chapter,
    topic: p.topic,
    status: APPROVED,
    language: LANG,
  }));

  const rows = await prisma.adaptiveMcq.findMany({
    where: { OR: orClause },
    select: { chapter: true, topic: true, conceptTested: true },
  });

  const labelByKey = new Map<string, string>();
  for (const row of rows) {
    const k = `${row.chapter}:${row.topic}`;
    const ct = row.conceptTested?.trim();
    if (ct && !labelByKey.has(k)) {
      labelByKey.set(k, ct);
    }
  }

  for (const p of uniquePairs) {
    const k = `${p.chapter}:${p.topic}`;
    const label = labelByKey.get(k);
    if (label) out.set(k, label);
  }

  return out;
}

export async function enrichWeakAreasWithTopicLabels<
  T extends { chapter: number; topic: string },
>(courseSlug: string | null | undefined, items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  const labels = await resolveAdaptiveTopicDisplayLabels(
    courseSlug,
    items.map((w) => ({ chapter: w.chapter, topic: w.topic }))
  );
  return items.map((w) => ({
    ...w,
    topic: labels.get(`${w.chapter}:${w.topic}`) ?? w.topic,
  }));
}
