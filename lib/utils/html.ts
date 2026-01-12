/**
 * Strip HTML tags from a string
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Strip HTML tags and decode HTML entities
 */
export function stripHtmlAndDecode(html: string | null | undefined): string {
  if (!html) return "";
  let text = html.replace(/<[^>]*>/g, ""); // Remove HTML tags
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  return text.trim();
}

