# Database: App Tables vs Knowledge Base Tables

This document identifies which tables in your Supabase `public` schema belong to the **Dojo Financier app** (managed by Prisma) vs the **pgvector knowledge base** (RAG/embeddings), to support separating them and staying under the 500 MB free-tier limit.

---

## Summary

| Category | Table count | Approx. size | In Prisma? |
|----------|-------------|--------------|------------|
| **App tables** | 52 | ~25 MB | Yes |
| **Knowledge base tables** | 14 | **~195 MB** | No |
| **Prisma internal** | 1 (`_prisma_migrations`) | ~32 KB | N/A |

The **Prisma schema already contains only app tables.** The knowledge base tables exist in the same database but are not (and should not be) in the Prisma schema.

---

## App tables (website – in Prisma schema)

These are used by the Dojo Financier app and are defined in `prisma/schema.prisma`:

| Table name | Approx. size |
|------------|--------------|
| `users` | 104 KB |
| `course_categories` | 64 KB |
| `courses` | 320 KB |
| `modules` | 96 KB |
| `content_items` | 1.2 MB |
| `videos` | 48 KB |
| `quizzes` | 136 KB |
| `quiz_questions` | 3 MB |
| `quiz_attempts` | 280 KB |
| `case_studies` | 136 KB |
| `case_study_questions` | 104 KB |
| `case_study_attempts` | 24 KB |
| `learning_activities` | 2.5 MB |
| `learning_activity_attempts` | 456 KB |
| `question_banks` | 104 KB |
| `question_bank_questions` | 3.4 MB |
| `question_bank_attempts` | 352 KB |
| `flashcards` | 1 MB |
| `flashcard_study_sessions` | 216 KB |
| `notes` | 1.1 MB |
| `stripe_webhook_events` | 64 KB |
| `enrollments` | 240 KB |
| `subscriptions` | 40 KB |
| `progress_tracking` | 88 KB |
| `analytics` | 16 KB |
| `messages` | 160 KB |
| `message_threads` | 96 KB |
| `appointments` | 80 KB |
| `appointment_availability` | 88 KB |
| `availability_rules` | 64 KB |
| `availability_exceptions` | 64 KB |
| `seo_articles` | 12 MB |
| `coupons` | 48 KB |
| `coupon_usage` | 24 KB |
| `support_tickets` | 112 KB |
| `support_ticket_replies` | 64 KB |
| `error_logs` | 2.4 MB |
| `cohorts` | 112 KB |
| `cohort_modules` | 112 KB |
| `cohort_enrollments` | 112 KB |
| `group_coaching_sessions` | 64 KB |
| `cohort_messages` | 80 KB |
| `cohort_message_reads` | 64 KB |
| `user_course_settings` | 112 KB |
| `module_progress` | 352 KB |
| `smart_review_items` | 136 KB |
| `smart_review_progress` | 48 KB |
| `assessment_results` | 32 KB |
| `investor_leads` | 48 KB |
| `investor_assessments` | 48 KB |
| `investor_report_instances` | 96 KB |
| `daily_plan_entries` | 1.6 MB |
| `course_faqs` | 104 KB |
| `cohort_faqs` | 64 KB |

---

## Knowledge base tables (pgvector / RAG – NOT in Prisma)

These tables store embeddings and RAG/knowledge-base data. They have `vector` (embedding) columns and are **not** referenced in the Prisma schema. They are the main source of database size.

| Table name | Approx. size | Notes |
|------------|--------------|--------|
| `primary_store_chunks` | **58 MB** | Chunk text + embeddings (primary store) |
| `csc_chunks` | **46 MB** | Course-specific chunks + embeddings |
| `chunks` | **40 MB** | Module chunks + embeddings |
| `note_sections` | **31 MB** | Note sections + embeddings |
| `source_candidates` | **12 MB** | Search/source candidate data |
| `exam_questions` | 3.9 MB | Exam Q&A + embeddings |
| `primary_store_notes` | 3.1 MB | Primary store notes metadata |
| `chunk_elements` | 2 MB | Chunk–element associations |
| `search_queries` | 560 KB | RAG search query log |
| `syllabus_elements` | 256 KB | Syllabus element metadata |
| `sources` | 48 KB | Source metadata |
| `volatile_facts` | 40 KB | Volatile facts for review |
| `element_sources` | 40 KB | Element–source links |
| `documents` | 32 KB | Document metadata |

**Total knowledge base (approx.): ~195 MB**

---

## Recommendation: separate the knowledge base

To stay under the 500 MB limit while keeping the app on the free plan:

1. **Move knowledge base to a second database**
   - Create a **second Supabase project** (or another Postgres host) for the knowledge base only.
   - Migrate the 14 knowledge base tables (and any related indexes/triggers) to that database.
   - Point your RAG/embedding pipeline and any services that query these tables to the new `DATABASE_URL` (e.g. `KNOWLEDGE_BASE_DATABASE_URL`).
   - Keep a single `DATABASE_URL` for the app and Prisma (current Supabase project).

2. **Prisma**
   - **No change needed.** Your `prisma/schema.prisma` already models only app tables. Do **not** add the knowledge base tables to Prisma; keep them in a separate DB and access them via raw SQL or a second client (e.g. `pg` or Supabase client) using `KNOWLEDGE_BASE_DATABASE_URL`.

3. **After moving the knowledge base**
   - App DB (current Supabase): only app tables + `_prisma_migrations` → well under 500 MB.
   - Knowledge base DB: all pgvector/RAG tables → can grow independently (or use a separate free/small plan for that project).

If you want, the next step can be: (1) a small script to list only “app” vs “knowledge base” tables from `information_schema` for future checks, or (2) a migration plan (order of tables, dependencies, and example `pg_dump`/restore commands) for moving the knowledge base to the second database.
