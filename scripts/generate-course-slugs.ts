/**
 * Migration script to generate slugs for all courses without slugs
 * 
 * This script:
 * 1. Finds all courses without slugs
 * 2. Generates slugs from course codes (or titles as fallback)
 * 3. Ensures uniqueness
 * 4. Updates the database
 * 
 * Usage:
 *   npx tsx scripts/generate-course-slugs.ts
 * 
 * Or with dry-run (preview only):
 *   npx tsx scripts/generate-course-slugs.ts --dry-run
 */

import { prisma } from "@/lib/prisma";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";

async function generateCourseSlugs(dryRun: boolean = false) {
  console.log("Starting course slug generation...");
  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

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
      slug: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${coursesWithoutSlugs.length} courses without slugs\n`);

  if (coursesWithoutSlugs.length === 0) {
    console.log("✅ All courses already have slugs!");
    return;
  }

  // Get all existing slugs to avoid duplicates
  const existingSlugs = await prisma.course.findMany({
    where: { slug: { not: null } },
    select: { slug: true },
  }).then(courses => courses.map(c => c.slug).filter(Boolean) as string[]);

  console.log(`Found ${existingSlugs.length} existing slugs\n`);

  let successCount = 0;
  let errorCount = 0;
  const updates: Array<{ id: string; code: string | null; title: string; newSlug: string }> = [];

  for (const course of coursesWithoutSlugs) {
    try {
      let slug: string;
      let source: string;

      if (course.code) {
        // Generate slug from code
        const baseSlug = generateSlug(course.code);
        slug = generateUniqueSlug(baseSlug, existingSlugs);
        source = "code";
      } else {
        // Fallback to title if no code
        const baseSlug = generateSlug(course.title);
        slug = generateUniqueSlug(baseSlug, existingSlugs);
        source = "title";
        console.warn(`⚠️  Course "${course.title}" (${course.id}) has no code, using title for slug: ${slug}`);
      }

      updates.push({
        id: course.id,
        code: course.code,
        title: course.title,
        newSlug: slug,
      });

      if (!dryRun) {
        // Update course with slug
        await prisma.course.update({
          where: { id: course.id },
          data: { slug },
        });
      }

      existingSlugs.push(slug);
      successCount++;
      
      const displayName = course.code || course.title;
      const action = dryRun ? "Would generate" : "Generated";
      console.log(`✅ ${action} slug for "${displayName}": ${slug} (from ${source})`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error generating slug for course ${course.id} (${course.title}):`, error);
    }
  }

  console.log(`\n${dryRun ? "🔍 DRY RUN " : ""}Migration ${dryRun ? "preview" : "complete"}!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);

  if (dryRun && updates.length > 0) {
    console.log(`\n📋 Preview of changes:`);
    updates.slice(0, 10).forEach(update => {
      console.log(`   - ${update.code || update.title} → ${update.newSlug}`);
    });
    if (updates.length > 10) {
      console.log(`   ... and ${updates.length - 10} more`);
    }
    console.log(`\nRun without --dry-run to apply changes.`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("-d");

generateCourseSlugs(dryRun)
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

