#!/usr/bin/env tsx
/**
 * Migrate knowledge base tables using Node.js pg package (no pg_dump/psql required).
 * Copies data from source to target database table by table.
 */

import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  try {
    require("dotenv").config({ path: envPath });
  } catch {
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
  "syllabus_elements",
  "sources",
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

async function copyTable(
  source: Client,
  target: Client,
  table: string
): Promise<number> {
  // Get PK column for ordering (for batched fetch)
  const pkRes = await source.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position LIMIT 1`,
    [table]
  );
  const orderCol = pkRes.rows[0]?.column_name || "id";

  const FETCH_BATCH = 200;
  let total = 0;
  let offset = 0;

  while (true) {
    const result = await source.query(
      `SELECT * FROM ${table} ORDER BY "${orderCol}" LIMIT ${FETCH_BATCH} OFFSET ${offset}`
    );
    const rows = result.rows;
    const fields = result.fields;

    if (rows.length === 0) break;

    const colList = fields!.map((f) => `"${f.name}"`).join(", ");
    const INSERT_BATCH = 50;

    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const batch = rows.slice(i, i + INSERT_BATCH);
      const valueSets = batch.map((row, bi) =>
        "(" + fields!.map((_, ci) => `$${bi * fields!.length + ci + 1}`).join(", ") + ")"
      );
      const flatValues = batch.flatMap((row) => fields!.map((f) => row[f.name]));
      await target.query(
        `INSERT INTO ${table} (${colList}) VALUES ${valueSets.join(", ")} ON CONFLICT DO NOTHING`,
        flatValues
      );
    }
    total += rows.length;
    offset += FETCH_BATCH;
    if (rows.length < FETCH_BATCH) break;
    if (total % 1000 === 0 && total > 0) process.stdout.write(` ${total}...`);
  }

  return total;
}

async function ensureColumnsMatch(source: Client, target: Client, table: string) {
  const srcCols = await source.query(
    `SELECT column_name, data_type, udt_name, character_maximum_length 
     FROM information_schema.columns 
     WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  const tgtCols = await target.query(
    `SELECT column_name, is_nullable, column_default 
     FROM information_schema.columns 
     WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  const srcSet = new Set(srcCols.rows.map((r) => r.column_name));
  const tgtSet = new Set(tgtCols.rows.map((r) => r.column_name));

  for (const c of srcCols.rows) {
    if (tgtSet.has(c.column_name)) continue;
    let def = c.udt_name === "uuid" ? "uuid" : c.data_type;
    if (c.udt_name === "vector") def = "vector(1536)";
    else if (c.character_maximum_length) def += `(${c.character_maximum_length})`;
    try {
      await target.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "${c.column_name}" ${def}`);
    } catch (e) {
      /* ignore */
    }
  }

  for (const c of tgtCols.rows) {
    if (srcSet.has(c.column_name)) continue;
    if (c.is_nullable === "NO" && !c.column_default) {
      try {
        await target.query(
          `ALTER TABLE ${table} ALTER COLUMN "${c.column_name}" DROP NOT NULL`
        );
      } catch (e) {
        try {
          await target.query(
            `ALTER TABLE ${table} ALTER COLUMN "${c.column_name}" SET DEFAULT 'erci'`
          );
        } catch {
          /* ignore */
        }
      }
    }
  }
}

async function main() {
  if (!DIRECT_URL || !TARGET_DIRECT_URL) {
    console.error("Missing DIRECT_URL or TARGET_DIRECT_URL in .env");
    process.exit(1);
  }

  console.log("=== Knowledge Base Migration (Node.js) ===\n");
  console.log("Tables:", KNOWLEDGE_BASE_TABLES.join(", "));

  const sourceClient = new Client({
    connectionString: DIRECT_URL,
    keepAlive: true,
    connectionTimeoutMillis: 60000,
  });
  const targetClient = new Client({
    connectionString: TARGET_DIRECT_URL,
    keepAlive: true,
    connectionTimeoutMillis: 60000,
  });

  try {
    await sourceClient.connect();
    console.log("Connected to source.");
    await targetClient.connect();
    console.log("Connected to target.");

    // Ensure vector extension on target
    await targetClient.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("Vector extension ready on target.");

    // Create tables on target if they don't exist
    const schemaPath = path.join(__dirname, "knowledge-base-schema-target.sql");
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, "utf-8");
      const statements = schemaSql
        .replace(/--[^\n]*/g, "")
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20);
      for (const stmt of statements) {
        try {
          await targetClient.query(stmt + ";");
        } catch (e) {
          const err = e as { code?: string };
          if (err.code !== "42P07" && err.code !== "42710") throw e;
          // 42P07=duplicate table, 42710=duplicate object
        }
      }
      console.log("Schema ready on target.\n");
    } else {
      // Add language column to existing target tables
      for (const table of KNOWLEDGE_BASE_TABLES) {
        try {
          await targetClient.query(
            `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS language text DEFAULT 'en'`
          );
          await targetClient.query(
            `UPDATE ${table} SET language = 'en' WHERE language IS NULL`
          );
        } catch (e) {
          // Table might not exist
        }
      }
    }

    // Copy each table
    for (const table of KNOWLEDGE_BASE_TABLES) {
      await ensureColumnsMatch(sourceClient, targetClient, table);
      process.stdout.write(`Copying ${table}... `);
      try {
        const count = await copyTable(sourceClient, targetClient, table);
        console.log(`${count} rows`);
      } catch (err) {
        console.error(`FAILED:`, (err as Error).message);
        throw err;
      }
    }

    console.log("\n=== Migration complete ===");
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
