/**
 * Removes a leading H1 from article body when it duplicates the page title
 * (common when CMS/export includes the title inside HTML/Markdown as well as in metadata).
 */
function normalizeTitle(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips the first heading from `content` when it matches `canonicalTitle`
 * (Markdown `# ...` or leading `<h1>...</h1>` in HTML).
 */
export function stripLeadingDuplicateH1(content: string, canonicalTitle: string): string {
  if (!content?.trim() || !canonicalTitle?.trim()) return content;

  const target = normalizeTitle(canonicalTitle);
  if (!target) return content;

  // Markdown: first line is ATX H1
  const md = content.match(/^\s*#\s+(.+?)\s*(\r?\n|$)/);
  if (md && normalizeTitle(md[1]) === target) {
    return content.slice(md[0].length).replace(/^\s+/, "");
  }

  // HTML: leading <h1>...</h1>
  const trimmed = content.trimStart();
  const h1 = trimmed.match(/^<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const inner = stripHtmlTags(h1[2] ?? "");
    if (normalizeTitle(inner) === target) {
      return trimmed.slice(h1[0].length).trimStart();
    }
  }

  return content;
}
