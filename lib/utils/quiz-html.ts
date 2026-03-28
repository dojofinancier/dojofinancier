/**
 * Plain text extracted from TipTap / admin HTML for validation (required fields).
 */
export function plainTextFromHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichTextNonEmpty(html: string): boolean {
  return plainTextFromHtml(html).length > 0;
}
