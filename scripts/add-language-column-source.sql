-- Run this on the SOURCE database BEFORE migration.
-- Adds a language column and sets all rows to 'fr' so the migrated content is identified as French.

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
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS language text DEFAULT ''fr''', t);
    EXECUTE format('UPDATE %I SET language = ''fr'' WHERE language IS NULL', t);
  END LOOP;
END $$;
