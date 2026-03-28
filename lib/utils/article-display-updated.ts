/**
 * Deterministic "display" updated date per article, stable for the current calendar month.
 *
 * Why not real `updatedAt` only?
 * - You asked for varied dates across articles (not identical) for SEO perception.
 *
 * Why not pure random each request?
 * - Would hurt caching and look unstable to crawlers.
 *
 * How this works:
 * - Hash( slug + "YYYY-M" ) picks a calendar day in the range
 *   [1 … min(today's day-of-month, last day of month)] so the date is **never in the future**.
 * - Same article + month → same date on every page load.
 * - When the month changes, each article gets a new day (monthly refresh).
 *
 * This is a **display** convention, not the DB truth. For `dateModified` in JSON-LD
 * we keep using `article.updatedAt` in `article-seo.tsx` unless you intentionally
 * align schema with UI (consult SEO guidelines before mirroring synthetic dates).
 */
export function getArticleDisplayUpdatedDate(
  slug: string,
  referenceDate: Date = new Date()
): Date {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  const periodKey = `${y}-${String(m + 1).padStart(2, "0")}`;

  let h = 2166136261;
  const str = `${slug}\0${periodKey}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayDom = referenceDate.getDate();
  const maxDayInRange = Math.min(todayDom, daysInMonth);
  const day = 1 + (Math.abs(h) % maxDayInRange);
  return new Date(y, m, day, 12, 0, 0, 0);
}

export function formatArticleDisplayUpdatedFr(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
