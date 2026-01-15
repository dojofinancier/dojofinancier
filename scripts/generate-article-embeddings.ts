/**
 * Batch generate embeddings for all published articles
 * 
 * Usage:
 *   npx tsx scripts/generate-article-embeddings.ts [--limit=10] [--offset=0] [--resume]
 */

import { PrismaClient } from "@prisma/client";
import { generateEmbedding, prepareTextForEmbedding } from "../lib/utils/embeddings";

const prisma = new PrismaClient();

interface Options {
  limit?: number;
  offset?: number;
  resume?: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options: Options = {};

  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--offset=")) {
      options.offset = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--resume") {
      options.resume = true;
    }
  }

  console.log("🚀 Starting batch embedding generation...");
  console.log(`Options:`, options);

  try {
    let articles;

    if (options.resume) {
      // Use raw SQL to find articles without embeddings (Prisma doesn't support Unsupported fields in where)
      let query = `
        SELECT id
        FROM seo_articles
        WHERE published = true
          AND content IS NOT NULL
          AND embedding IS NULL
        ORDER BY published_at DESC
      `;
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }

      const articleIds = await prisma.$queryRawUnsafe<Array<{ id: string }>>(query);

      const ids = articleIds.map((a) => a.id);
      if (ids.length === 0) {
        console.log("\n✅ All articles already have embeddings\n");
        return;
      }

      articles = await prisma.blogArticle.findMany({
        where: {
          id: { in: ids },
        },
        select: {
          id: true,
          title: true,
          excerpt: true,
          content: true,
          slug: true,
        },
        orderBy: {
          publishedAt: "desc",
        },
      });
    } else {
      // Find articles that need embeddings
      const whereClause: any = {
        published: true,
        content: { not: null },
      };

      articles = await prisma.blogArticle.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          excerpt: true,
          content: true,
          slug: true,
        },
        take: options.limit,
        skip: options.offset,
        orderBy: {
          publishedAt: "desc",
        },
      });
    }

    console.log(`\n📄 Found ${articles.length} articles to process\n`);

    let processed = 0;
    let errors = 0;
    const startTime = Date.now();

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const progress = `[${i + 1}/${articles.length}]`;

      try {
        console.log(`${progress} Processing: ${article.title.substring(0, 60)}...`);

        // Prepare text for embedding: title + excerpt + first 500 words
        const excerpt = article.excerpt || "";
        const contentPreview = article.content
          ? article.content.split(/\s+/).slice(0, 500).join(" ")
          : "";

        const textToEmbed = [
          article.title,
          excerpt,
          prepareTextForEmbedding(contentPreview),
        ]
          .filter(Boolean)
          .join("\n\n");

        // Generate embedding
        const embedding = await generateEmbedding(textToEmbed);

        // Store embedding in database using raw SQL
        // Convert array to PostgreSQL vector format: [1,2,3]::vector
        const vectorString = `[${embedding.join(",")}]`;
        await prisma.$executeRaw`
          UPDATE seo_articles 
          SET embedding = ${vectorString}::vector 
          WHERE id = ${article.id}
        `;

        processed++;
        console.log(`  ✅ Embedding generated and stored\n`);
      } catch (error) {
        errors++;
        console.error(`  ❌ Error: ${error instanceof Error ? error.message : "Unknown error"}\n`);
      }

      // Small delay to avoid rate limiting
      if (i < articles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n" + "=".repeat(60));
    console.log("📊 Summary:");
    console.log(`  ✅ Processed: ${processed}`);
    console.log(`  ❌ Errors: ${errors}`);
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
