/**
 * Publish all unpublished articles with content
 * 
 * Usage:
 *   npx tsx scripts/publish-new-articles.ts [--course=NEGP]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Options {
  course?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const options: Options = {};

  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith("--course=")) {
      options.course = arg.split("=")[1];
    }
  }

  console.log("📝 Publishing unpublished articles...");
  console.log(`Options:`, options);

  try {
    const whereClause: any = {
      OR: [
        { published: false },
        { published: null },
      ],
      content: { not: null },
    };

    if (options.course) {
      whereClause.course = options.course;
    }

    // Find unpublished articles
    const unpublishedArticles = await prisma.blogArticle.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        course: true,
      },
    });

    console.log(`\n📄 Found ${unpublishedArticles.length} unpublished articles\n`);

    if (unpublishedArticles.length === 0) {
      console.log("✅ No articles to publish\n");
      return;
    }

    // Publish all articles
    const result = await prisma.blogArticle.updateMany({
      where: whereClause,
      data: {
        published: true,
        publishedAt: new Date(),
      },
    });

    console.log(`✅ Published ${result.count} articles\n`);

    // Show sample of published articles
    console.log("Sample of published articles:");
    unpublishedArticles.slice(0, 5).forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title.substring(0, 60)}...`);
    });
    if (unpublishedArticles.length > 5) {
      console.log(`  ... and ${unpublishedArticles.length - 5} more\n`);
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
