/**
 * Order weak-area rows for UI: chapter 1, 2, … then by frequency, then topic.
 */
export function sortWeakAreasForDisplay<
  T extends { chapter: number; hitCount: number; topic: string },
>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    if (b.hitCount !== a.hitCount) return b.hitCount - a.hitCount;
    return a.topic.localeCompare(b.topic, "fr", { sensitivity: "base" });
  });
}
