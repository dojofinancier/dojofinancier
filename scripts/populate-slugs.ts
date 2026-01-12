/**
 * Script to populate slugs for existing courses and cohorts that don't have them
 * Run with: tsx scripts/populate-slugs.ts
 */

import { PrismaClient } from "@prisma/client";
import { generateSlug, generateUniqueSlug } from "../lib/utils/slug";

const prisma = new PrismaClient();

async function populateCourseSlugs() {
  console.log("Populating course slugs...");

  // Get all courses without slugs
  const coursesWithoutSlugs = await prisma.course.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: "" },
      ],
    },
    select: {
      id: true,
      code: true,
      title: true,
    },
  });

  console.log(`Found ${coursesWithoutSlugs.length} courses without slugs`);

  // Get all existing slugs to avoid duplicates
  const existingSlugs = await prisma.course.findMany({
    where: { slug: { not: null } },
    select: { slug: true },
  }).then(courses => courses.map(c => c.slug).filter(Boolean) as string[]);

  let updated = 0;
  for (const course of coursesWithoutSlugs) {
    // Generate slug from code if available, otherwise from title
    const sourceText = course.code || course.title;
    if (!sourceText) {
      console.warn(`Skipping course ${course.id} - no code or title`);
      continue;
    }

    const baseSlug = generateSlug(sourceText);
    const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

    await prisma.course.update({
      where: { id: course.id },
      data: { slug: uniqueSlug },
    });

    existingSlugs.push(uniqueSlug);
    updated++;
    console.log(`Updated course ${course.id}: ${course.code || course.title} -> ${uniqueSlug}`);
  }

  console.log(`✓ Updated ${updated} course slugs`);
}

async function populateCohortSlugs() {
  console.log("\nPopulating cohort slugs...");

  // Get all cohorts without slugs
  const cohortsWithoutSlugs = await prisma.cohort.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: "" },
      ],
    },
    select: {
      id: true,
      title: true,
    },
  });

  console.log(`Found ${cohortsWithoutSlugs.length} cohorts without slugs`);

  // Get all existing slugs to avoid duplicates
  const existingSlugs = await prisma.cohort.findMany({
    where: { slug: { not: null } },
    select: { slug: true },
  }).then(cohorts => cohorts.map(c => c.slug).filter(Boolean) as string[]);

  let updated = 0;
  for (const cohort of cohortsWithoutSlugs) {
    if (!cohort.title) {
      console.warn(`Skipping cohort ${cohort.id} - no title`);
      continue;
    }

    const baseSlug = generateSlug(cohort.title);
    const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

    await prisma.cohort.update({
      where: { id: cohort.id },
      data: { slug: uniqueSlug },
    });

    existingSlugs.push(uniqueSlug);
    updated++;
    console.log(`Updated cohort ${cohort.id}: ${cohort.title} -> ${uniqueSlug}`);
  }

  console.log(`✓ Updated ${updated} cohort slugs`);
}

async function main() {
  try {
    await populateCourseSlugs();
    await populateCohortSlugs();
    console.log("\n✓ All slugs populated successfully!");
  } catch (error) {
    console.error("Error populating slugs:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

