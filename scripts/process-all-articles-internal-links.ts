/**
 * Complete workflow: Publish, generate embeddings, and build internal links for all articles
 * 
 * Usage:
 *   npx tsx scripts/process-all-articles-internal-links.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting complete internal links workflow for all articles...\n");

  try {
    // Step 1: Check current status
    const stats = await prisma.$queryRaw<Array<{
      total: bigint;
      published: bigint;
      unpublished: bigint;
      with_embeddings: bigint;
      published_with_embeddings: bigint;
    }>>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE published = true) as published,
        COUNT(*) FILTER (WHERE published = false OR published IS NULL) as unpublished,
        COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
        COUNT(*) FILTER (WHERE published = true AND embedding IS NOT NULL) as published_with_embeddings
      FROM seo_articles
      WHERE content IS NOT NULL
    `;

    const statsData = stats[0];
    console.log("📊 Current Status:");
    console.log(`  Total articles: ${statsData.total}`);
    console.log(`  Published: ${statsData.published}`);
    console.log(`  Unpublished: ${statsData.unpublished}`);
    console.log(`  With embeddings: ${statsData.with_embeddings}`);
    console.log(`  Published with embeddings: ${statsData.published_with_embeddings}\n`);

    // Step 2: Check if all published articles have embeddings
    const missingEmbeddings = Number(statsData.published) - Number(statsData.published_with_embeddings);
    
    if (missingEmbeddings > 0) {
      console.log(`⚠️  ${missingEmbeddings} published articles are missing embeddings.`);
      console.log(`   Run: npx tsx scripts/generate-article-embeddings.ts --resume\n`);
    } else {
      console.log("✅ All published articles have embeddings\n");
    }

    // Step 3: Check articles with internal links
    const withLinks = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM seo_articles
      WHERE published = true
        AND content IS NOT NULL
        AND internal_links_metadata IS NOT NULL
    `;

    const linkedCount = Number(withLinks[0].count);
    const totalPublished = Number(statsData.published);
    const unlinkedCount = totalPublished - linkedCount;

    console.log("🔗 Internal Links Status:");
    console.log(`  Articles with links: ${linkedCount}`);
    console.log(`  Articles without links: ${unlinkedCount}\n`);

    if (unlinkedCount > 0) {
      console.log(`📝 Next step: Run internal link building for all articles:`);
      console.log(`   npx tsx scripts/add-internal-links.ts\n`);
    } else {
      console.log("✅ All articles have internal links\n");
    }

  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
