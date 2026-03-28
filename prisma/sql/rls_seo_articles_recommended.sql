-- =============================================================================
-- RLS: seo_articles (BlogArticle in Prisma)
-- =============================================================================
-- Context:
--   prisma/rls-policies.sql targets table name "blog_articles" with policies that
--   use status = 'PUBLISHED'::"BlogStatus". Your live table is "seo_articles"
--   and the app filters on "published" (boolean) — see app/actions/blog.ts.
--
-- When to use:
--   Apply if pg_policies shows no rows for seo_articles, or policies reference
--   a renamed/dropped blog_articles table.
--
-- Roles:
--   These policies assume Supabase-style auth + helpers from rls-policies.sql:
--   get_current_user_id(), is_admin(). Service role / superuser bypasses RLS.
--
-- Idempotent: safe to re-run after adjusting policy names if they already exist.
-- =============================================================================

ALTER TABLE seo_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_published_seo_articles" ON seo_articles;
DROP POLICY IF EXISTS "admin_manage_seo_articles" ON seo_articles;
-- Legacy names from old blog_articles script (if migrated onto seo_articles):
DROP POLICY IF EXISTS "public_select_published_blog_articles" ON seo_articles;
DROP POLICY IF EXISTS "admin_manage_blog_articles" ON seo_articles;

-- Public read: align with app/actions/blog.ts (published = true)
CREATE POLICY "public_select_published_seo_articles" ON seo_articles
  FOR SELECT
  USING (COALESCE(published, false) = true);

-- Full CRUD for admins (drafts, embeddings, internal fields)
CREATE POLICY "admin_manage_seo_articles" ON seo_articles
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Optional: allow authenticated non-admin to read drafts they own — not modeled here;
-- add only if you store author_id on articles later.
