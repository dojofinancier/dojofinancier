-- Run this on the TARGET database.
-- Adds a language column: existing (English) rows get 'en', migrated (French) rows get 'fr'.
--
-- IMPORTANT: Run add-language-column-source.sql on SOURCE *before* migration
-- so the French data is dumped with language='fr'.
--
-- If migration already ran and French rows have language=NULL or 'en', run an UPDATE.
-- Example (adjust timestamp to when you migrated):
--   UPDATE chunks SET language = 'fr' WHERE created_at > '2025-02-17';

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'syllabus_elements', 'sources', 'documents', 'primary_store_notes',
    'search_queries', 'chunks', 'csc_chunks', 'primary_store_chunks',
    'chunk_elements', 'element_sources', 'note_sections', 'source_candidates',
    'volatile_facts', 'exam_questions'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    -- Add column with default 'en' for existing English rows
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS language text DEFAULT ''en''', t);
    -- Ensure existing rows are marked as English
    EXECUTE format('UPDATE %I SET language = ''en'' WHERE language IS NULL', t);
  END LOOP;
END $$;
