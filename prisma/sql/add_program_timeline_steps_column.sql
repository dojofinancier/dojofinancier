-- Additive migration: program timeline JSON on courses (run manually if migrate dev is not available)
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "program_timeline_steps" JSONB;
