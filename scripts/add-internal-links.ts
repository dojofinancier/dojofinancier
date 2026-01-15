/**
 * Batch process to add internal links to all articles using semantic similarity
 * 
 * Usage:
 *   npx tsx scripts/add-internal-links.ts [--article-id=<id>] [--dry-run] [--target-links=3]
 */

import { PrismaClient } from "@prisma/client";
import {
  detectInternalLinkOpportunities,
  insertInternalLinks,
} from "../app/actions/blog";

const prisma = new PrismaClient();

interface Options {
  articleId?: string;
  dryRun?: boolean;
  targetLinks?: number;
}

async function main() {
  const args = process.argv.slice(2);
  const options: Options = {
    targetLinks: 3,
  };

  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith("--article-id=")) {
      options.articleId = arg.split("=")[1];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--target-links=")) {
      options.targetLinks = parseInt(arg.split("=")[1], 10);
    }
  }

  console.log("🔗 Starting internal links generation...");
  console.log(`Options:`, options);
  console.log(`Mode: ${options.dryRun ? "DRY RUN (no changes will be saved)" : "LIVE"}\n`);

  try {
    let articles;

    if (options.articleId) {
      // Process single article
      const article = await prisma.blogArticle.findUnique({
        where: { id: options.articleId },
        select: {
          id: true,
          title: true,
          content: true,
          slug: true,
        },
      });

      if (!article) {
        console.error(`❌ Article with ID ${options.articleId} not found`);
        process.exit(1);
      }

      articles = [article];
    } else {
      // Process all published articles with content and embeddings
      const allArticles = await prisma.blogArticle.findMany({
        where: {
          published: true,
          content: { not: null },
        },
        select: {
          id: true,
          title: true,
          content: true,
          slug: true,
        },
        orderBy: {
          publishedAt: "desc",
        },
      });

      // If --limit is provided, use it
      const limitArg = args.find((arg) => arg.startsWith("--limit="));
      if (limitArg) {
        const limit = parseInt(limitArg.split("=")[1], 10);
        articles = allArticles.slice(0, limit);
      } else {
        articles = allArticles;
      }
    }

    console.log(`📄 Found ${articles.length} articles to process\n`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    let totalLinksInserted = 0;
    const startTime = Date.now();

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const progress = `[${i + 1}/${articles.length}]`;

      try {
        console.log(`${progress} Processing: ${article.title.substring(0, 60)}...`);

        if (!article.content) {
          console.log(`  ⏭️  Skipped: No content\n`);
          skipped++;
          continue;
        }

        // Check if article has embedding
        const hasEmbedding = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM seo_articles
          WHERE id = ${article.id}
            AND embedding IS NOT NULL
        `;

        if (hasEmbedding[0].count === BigInt(0)) {
          console.log(`  ⏭️  Skipped: No embedding (run generate-article-embeddings.ts first)\n`);
          skipped++;
          continue;
        }

        // Detect link opportunities
        const opportunities = await detectInternalLinkOpportunities(
          article.id,
          article.content,
          options.targetLinks
        );

        if (opportunities.length === 0) {
          console.log(`  ℹ️  No link opportunities found\n`);
          skipped++;
          continue;
        }

        console.log(`  🔍 Found ${opportunities.length} link opportunities:`);
        for (const opp of opportunities) {
          console.log(
            `     - "${opp.keyword}" → ${opp.targetTitle.substring(0, 50)}... (similarity: ${opp.similarityScore.toFixed(3)})`
          );
        }

        if (options.dryRun) {
          console.log(`  🔍 DRY RUN: Would insert ${opportunities.length} links\n`);
          processed++;
          totalLinksInserted += opportunities.length;
        } else {
          // Insert links
          const result = await insertInternalLinks(
            article.id,
            opportunities.map((opp) => ({
              keyword: opp.keyword,
              targetSlug: opp.targetSlug,
              position: opp.position,
            }))
          );

          if (result.success) {
            console.log(`  ✅ Inserted ${result.linksInserted} links\n`);
            processed++;
            totalLinksInserted += result.linksInserted;
          } else {
            console.error(`  ❌ Error: ${result.error}\n`);
            errors++;
          }
        }
      } catch (error) {
        errors++;
        console.error(`  ❌ Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      }

      // Small delay to avoid rate limiting
      if (i < articles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n" + "=".repeat(60));
    console.log("📊 Summary:");
    console.log(`  ✅ Processed: ${processed}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  🔗 Total links inserted: ${totalLinksInserted}`);
    console.log(`  ⏱️  Duration: ${duration}s`);
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
