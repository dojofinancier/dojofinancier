/**
 * Calculate reading time for an article
 * @param content - Article content (HTML or plain text)
 * @returns Reading time in minutes
 */
export function calculateReadingTime(content: string | null | undefined): number {
  if (!content) return 0;
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}
