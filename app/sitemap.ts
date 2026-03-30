import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/seo/json-ld";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteOrigin();
  const now = new Date();

  const staticPaths: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/formations`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/article`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/a-propos`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    {
      url: `${base}/politique-de-confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    { url: `${base}/termes-et-conditions`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/investisseur`, lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: `${base}/investisseur/questionnaire`, lastModified: now, changeFrequency: "monthly", priority: 0.55 },
    { url: `${base}/investisseur/waitlist`, lastModified: now, changeFrequency: "monthly", priority: 0.45 },
    { url: `${base}/entrepreneur/waitlist`, lastModified: now, changeFrequency: "monthly", priority: 0.45 },
  ];

  const [articles, courses, cohorts] = await Promise.all([
    prisma.blogArticle.findMany({
      where: {
        published: true,
        content: { not: null },
        OR: [{ isIndexable: true }, { isIndexable: null }],
      },
      select: { slug: true, updatedAt: true, publishedAt: true },
    }),
    prisma.course.findMany({
      where: { published: true, slug: { not: null } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.cohort.findMany({
      where: {
        published: true,
        slug: { not: null },
        OR: [{ launchDate: null }, { launchDate: { lte: now } }],
      },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/article/${a.slug}`,
    lastModified: a.updatedAt ?? a.publishedAt ?? now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const courseEntries: MetadataRoute.Sitemap = courses
    .filter((c): c is typeof c & { slug: string } => Boolean(c.slug))
    .map((c) => ({
      url: `${base}/formations/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const cohortEntries: MetadataRoute.Sitemap = cohorts
    .filter((c): c is typeof c & { slug: string } => Boolean(c.slug))
    .map((c) => ({
      url: `${base}/cohorte/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

  return [...staticPaths, ...articleEntries, ...courseEntries, ...cohortEntries];
}
