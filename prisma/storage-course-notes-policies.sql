-- ============================================================================
-- Supabase Storage RLS policies for bucket "course-notes"
-- ============================================================================
-- Run this in Supabase Dashboard → SQL Editor (one-time).
-- Ensures: (1) anyone can read/download PDFs, (2) logged-in users can upload.
--
-- If you get "policy already exists", run this first (then run the CREATEs below):
--   DROP POLICY IF EXISTS "course-notes: public read" ON storage.objects;
--   DROP POLICY IF EXISTS "course-notes: authenticated insert" ON storage.objects;
--   DROP POLICY IF EXISTS "course-notes: authenticated update" ON storage.objects;
--   DROP POLICY IF EXISTS "course-notes: authenticated delete" ON storage.objects;
-- ============================================================================

-- 1. Public read: allow anyone to view/download files in course-notes
--    (required for opening PDF links in the app or in a new tab)
CREATE POLICY "course-notes: public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'course-notes');

-- 2. Authenticated upload: allow logged-in users to upload (admin + students)
CREATE POLICY "course-notes: authenticated insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-notes');

-- 3. Authenticated update: allow overwrite (e.g. admin replaces PDF)
CREATE POLICY "course-notes: authenticated update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course-notes')
WITH CHECK (bucket_id = 'course-notes');

-- 4. Authenticated delete: allow remove (e.g. admin removes PDF)
CREATE POLICY "course-notes: authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-notes');
