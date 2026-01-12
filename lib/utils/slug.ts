/**
 * Generate a URL-friendly slug from a string
 * Handles French accents and special characters
 */
export function generateSlug(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .normalize("NFD") // Normalize to decomposed form (é -> e + ́)
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
}

/**
 * Generate a unique slug by appending a number if needed
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

