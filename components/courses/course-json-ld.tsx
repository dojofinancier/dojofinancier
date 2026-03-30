import { getOrganizationSchemaId, getSiteOrigin, toAbsoluteUrl } from "@/lib/seo/json-ld";

function toPlainText(htmlOrText: string | null | undefined, maxLen = 8000): string {
  if (!htmlOrText?.trim()) return "";
  return htmlOrText
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export interface CourseJsonLdCourseInput {
  title: string;
  shortDescription: string | null;
  description: string | null;
  slug: string | null;
  price: number;
  heroImages: string[];
}

interface CourseJsonLdProps {
  course: CourseJsonLdCourseInput;
}

/**
 * Course structured data for public formation product pages (price in CAD matches formatCurrency on the page).
 */
export function CourseJsonLd({ course }: CourseJsonLdProps) {
  const origin = getSiteOrigin();
  const slug = course.slug?.trim();
  if (!slug) return null;

  const pageUrl = `${origin}/formations/${slug}`;
  const plainDescription =
    toPlainText(course.shortDescription) || toPlainText(course.description) || course.title;

  const firstHero = course.heroImages?.find((u) => typeof u === "string" && u.trim());
  const image = firstHero ? toAbsoluteUrl(firstHero, origin) : undefined;

  const courseNode: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${pageUrl}#course`,
    name: course.title,
    description: plainDescription,
    url: pageUrl,
    provider: {
      "@id": getOrganizationSchemaId(),
    },
    ...(image ? { image } : {}),
    offers: {
      "@type": "Offer",
      price: course.price.toFixed(2),
      priceCurrency: "CAD",
      url: pageUrl,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(courseNode) }}
    />
  );
}
