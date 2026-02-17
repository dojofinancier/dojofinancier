#!/usr/bin/env tsx
/**
 * Migrate knowledge base tables from source Supabase to target database.
 *
 * These 14 tables are NOT in the Prisma schema and are used only for one-off
 * content generation (RAG/embeddings). Migrating them frees ~195 MB from the
 * main app database.
 *
 * Prerequisites:
 * - PostgreSQL client tools (pg_dump, psql) in PATH
 * - TARGET_DATABASE_URL and TARGET_DIRECT_URL in .env
 * - vector extension enabled on target (Supabase has it by default)
 *
 * Usage: npx tsx scripts/migrate-knowledge-base.ts [--dry-run]
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Load .env from project root (script runs from project root via npm)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  try {
    require("dotenv").config({ path: envPath });
  } catch {
    // Fallback: manual parse
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const DIRECT_URL = process.env.DIRECT_URL;
const TARGET_DIRECT_URL = process.env.TARGET_DIRECT_URL;

const KNOWLEDGE_BASE_TABLES = [
  "syllabus_elements", // Base - no deps
  "sources", // Base - no deps
  "documents",
  "primary_store_notes",
  "search_queries",
  "chunks",
  "csc_chunks",
  "primary_store_chunks",
  "chunk_elements",
  "element_sources",
  "note_sections",
  "source_candidates",
  "volatile_facts",
  "exam_questions",
];

function urlEncodePassword(url: string): string {
  // Passwords with &, >, etc. need URL encoding in connection strings
  try {
    const match = url.match(/^([^:]+:\/\/[^:]+:)([^@]+)(@.*)$/);
    if (match) {
      const password = match[2];
      const encoded = encodeURIComponent(password);
      if (encoded !== password) return match[1] + encoded + match[3];
    }
  } catch {
    // Ignore encoding errors
  }
  return url;
}

function checkPgTools() {
  try {
    execSync("pg_dump --version", { stdio: "pipe" });
    execSync("psql --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd: string, description: string, dryRun: boolean) {
  console.log(`\n${description}`);
  if (dryRun) {
    console.log(`  [DRY RUN] ${cmd}`);
    return;
  }
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.error(`\nFailed: ${description}`);
    throw err;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!DIRECT_URL || !TARGET_DIRECT_URL) {
    console.error(
      "Missing DIRECT_URL or TARGET_DIRECT_URL in .env. Add both and retry."
    );
    process.exit(1);
  }

  if (!dryRun && !checkPgTools()) {
    console.error(
      "\nPostgreSQL client tools (pg_dump, psql) not found in PATH.\n" +
        "Install them via: https://www.postgresql.org/download/\n" +
        "Or use Docker: docker run -it --rm postgres:16 pg_dump --version"
    );
    process.exit(1);
  }

  console.log("=== Knowledge Base Migration ===\n");
  console.log("Tables to migrate:", KNOWLEDGE_BASE_TABLES.join(", "));
  console.log("\nSource:", DIRECT_URL.replace(/:[^:@]+@/, ":****@"));
  console.log("Target:", TARGET_DIRECT_URL.replace(/:[^:@]+@/, ":****@"));

  const dumpPath = path.join(__dirname, "..", "knowledge-base-migration.dump");

  const tableArgs = KNOWLEDGE_BASE_TABLES.map((t) => `-t ${t}`).join(" ");

  // Step 1: Dump schema + data from source
  const sourceUrl = urlEncodePassword(DIRECT_URL);
  run(
    `pg_dump "${sourceUrl}" --schema=public --format=custom --file="${dumpPath}" ${tableArgs}`,
    "Step 1: Dumping knowledge base tables from source...",
    dryRun
  );

  // Step 2: Enable vector extension on target (if not exists)
  const targetUrl = urlEncodePassword(TARGET_DIRECT_URL);
  run(
    `psql "${targetUrl}" -c "CREATE EXTENSION IF NOT EXISTS vector;"`,
    "Step 2: Ensuring vector extension on target...",
    dryRun
  );

  // Step 3: Restore to target (--clean drops existing objects, --if-exists avoids errors)
  run(
    `pg_restore --dbname="${targetUrl}" --no-owner --no-acl "${dumpPath}"`,
    "Step 3: Restoring to target database...",
    dryRun
  );

  if (!dryRun && fs.existsSync(dumpPath)) {
    fs.unlinkSync(dumpPath);
    console.log("\nCleaned up dump file.");
  }

  console.log("\n=== Migration complete ===");
  console.log(`
Next steps (run on SOURCE database via Supabase SQL Editor):

1. Drop the FK from notes to syllabus_elements (notes has 0 rows with element_id):
   ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_element_id_fkey;

2. Optionally drop the unused element_id column from notes:
   ALTER TABLE notes DROP COLUMN IF EXISTS element_id;

3. Drop the migrated tables:
   DROP TABLE IF EXISTS source_candidates CASCADE;
   DROP TABLE IF EXISTS note_sections CASCADE;
   DROP TABLE IF EXISTS chunk_elements CASCADE;
   DROP TABLE IF EXISTS element_sources CASCADE;
   DROP TABLE IF EXISTS volatile_facts CASCADE;
   DROP TABLE IF EXISTS primary_store_chunks CASCADE;
   DROP TABLE IF EXISTS csc_chunks CASCADE;
   DROP TABLE IF EXISTS chunks CASCADE;
   DROP TABLE IF EXISTS search_queries CASCADE;
   DROP TABLE IF EXISTS primary_store_notes CASCADE;
   DROP TABLE IF EXISTS documents CASCADE;
   DROP TABLE IF EXISTS exam_questions CASCADE;
   DROP TABLE IF EXISTS syllabus_elements CASCADE;
   DROP TABLE IF EXISTS sources CASCADE;

4. Update any RAG/content-generation scripts to use TARGET_DATABASE_URL
   instead of DATABASE_URL when querying these tables.
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
