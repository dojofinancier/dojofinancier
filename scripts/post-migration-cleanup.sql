-- Run this in the SOURCE database (Supabase SQL Editor) AFTER migration completes.
-- This drops the FK from notes, optionally removes element_id, and drops the migrated tables.

-- 1. Drop FK from notes to syllabus_elements (notes has 0 rows with element_id)
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_element_id_fkey;

-- 2. Optionally drop the unused element_id column from notes
--    (Uncomment if you want to remove it - the app doesn't use it)
-- ALTER TABLE notes DROP COLUMN IF EXISTS element_id;

-- 3. Drop the migrated knowledge base tables (order respects FK dependencies)
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
