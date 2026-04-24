-- ============================================================================
-- Add onboarding email logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_email_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  enrollment_id text NOT NULL REFERENCES accompagnement_enrollments(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  provider text NOT NULL DEFAULT 'sender.net',
  status text NOT NULL,
  email_message_id text NULL,
  error_message text NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_email_logs_enrollment_created_idx
  ON onboarding_email_logs (enrollment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS onboarding_email_logs_status_created_idx
  ON onboarding_email_logs (status, created_at DESC);

