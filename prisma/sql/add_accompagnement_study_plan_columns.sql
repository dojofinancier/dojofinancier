-- Run manually on Supabase if `prisma db push` is blocked by unrelated drift.
-- Accompagnement study plan (horizon + weekly detail fields)

ALTER TABLE accompagnement_enrollments
  ADD COLUMN IF NOT EXISTS study_plan_horizon jsonb,
  ADD COLUMN IF NOT EXISTS compressed_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ack_unrealistic_schedule boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_plan_generated_at timestamptz;

ALTER TABLE weekly_plans
  ADD COLUMN IF NOT EXISTS phase text,
  ADD COLUMN IF NOT EXISTS plan_status text,
  ADD COLUMN IF NOT EXISTS weekly_goal_summary text,
  ADD COLUMN IF NOT EXISTS selected_chapters_detail jsonb,
  ADD COLUMN IF NOT EXISTS chapter_confirmations jsonb,
  ADD COLUMN IF NOT EXISTS estimated_hours integer;
