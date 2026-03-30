import type { Metadata } from "next";
import { getSiteOrigin, SITE_ORGANIZATION_NAME } from "@/lib/seo/json-ld";

/** Plain-text snippet from HTML or prose (for meta descriptions). */
export function toPlainMetaDescription(htmlOrText: string | null | undefined, maxLen = 160): string {
  if (!htmlOrText?.trim()) return "";
  const plain = htmlOrText
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen - 1).trim()}…`;
}

export function absoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}

export function siteOpenGraphDefaults(): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    locale: "fr_CA",
    siteName: SITE_ORGANIZATION_NAME,
  };
}

export function siteTwitterDefaults(): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
  };
}

/** Consolidate duplicate listing URLs (filters) to the canonical index URL. */
export const ARTICLE_INDEX_CANONICAL_PATH = "/article";
