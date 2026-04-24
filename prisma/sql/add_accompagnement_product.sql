-- Accompagnement Product Schema Migration
-- Creates all tables, enums, and indexes for the accountability/follow-up product

-- Enums
DO $$ BEGIN
  CREATE TYPE "CheckInFrequency" AS ENUM ('DAILY', 'THREE_PER_WEEK', 'WEEKDAYS_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CheckInTemplateType" AS ENUM ('MCQ', 'OPEN_QUESTION', 'CONFIRMATION', 'FEEDBACK', 'ENCOURAGEMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CheckInStatus" AS ENUM ('SCHEDULED', 'SENT', 'RESPONDED', 'MISSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AccompagnementLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AccompagnementProduct
CREATE TABLE IF NOT EXISTS "accompagnement_products" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "access_duration_days" INTEGER NOT NULL DEFAULT 365,
    "check_in_frequency" "CheckInFrequency" NOT NULL DEFAULT 'DAILY',
    "send_time" TEXT NOT NULL DEFAULT '08:00',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accompagnement_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "accompagnement_products_course_id_key" ON "accompagnement_products"("course_id");

ALTER TABLE "accompagnement_products"
  DROP CONSTRAINT IF EXISTS "accompagnement_products_course_id_fkey";
ALTER TABLE "accompagnement_products"
  ADD CONSTRAINT "accompagnement_products_course_id_fkey"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AccompagnementEnrollment
CREATE TABLE IF NOT EXISTS "accompagnement_enrollments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "accompagnement_product_id" TEXT NOT NULL,
    "payment_intent_id" TEXT,
    "order_number" INTEGER,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "exclude_from_stats" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accompagnement_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "accompagnement_enrollments_order_number_key" ON "accompagnement_enrollments"("order_number");
CREATE UNIQUE INDEX IF NOT EXISTS "accompagnement_enrollments_user_id_accompagnement_product_id_key" ON "accompagnement_enrollments"("user_id", "accompagnement_product_id");
CREATE INDEX IF NOT EXISTS "accompagnement_enrollments_user_id_idx" ON "accompagnement_enrollments"("user_id");
CREATE INDEX IF NOT EXISTS "accompagnement_enrollments_accompagnement_product_id_idx" ON "accompagnement_enrollments"("accompagnement_product_id");
CREATE INDEX IF NOT EXISTS "accompagnement_enrollments_is_active_idx" ON "accompagnement_enrollments"("is_active");

ALTER TABLE "accompagnement_enrollments"
  DROP CONSTRAINT IF EXISTS "accompagnement_enrollments_user_id_fkey";
ALTER TABLE "accompagnement_enrollments"
  ADD CONSTRAINT "accompagnement_enrollments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "accompagnement_enrollments"
  DROP CONSTRAINT IF EXISTS "accompagnement_enrollments_accompagnement_product_id_fkey";
ALTER TABLE "accompagnement_enrollments"
  ADD CONSTRAINT "accompagnement_enrollments_accompagnement_product_id_fkey"
  FOREIGN KEY ("accompagnement_product_id") REFERENCES "accompagnement_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AccompagnementOnboarding
CREATE TABLE IF NOT EXISTS "accompagnement_onboardings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3),
    "study_hours_per_week" INTEGER NOT NULL DEFAULT 6,
    "current_level" "AccompagnementLevel" NOT NULL DEFAULT 'BEGINNER',
    "confidence_level" INTEGER NOT NULL DEFAULT 3,
    "additional_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accompagnement_onboardings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "accompagnement_onboardings_enrollment_id_key" ON "accompagnement_onboardings"("enrollment_id");

ALTER TABLE "accompagnement_onboardings"
  DROP CONSTRAINT IF EXISTS "accompagnement_onboardings_enrollment_id_fkey";
ALTER TABLE "accompagnement_onboardings"
  ADD CONSTRAINT "accompagnement_onboardings_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "accompagnement_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckInTemplate
CREATE TABLE IF NOT EXISTS "check_in_templates" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "accompagnement_product_id" TEXT NOT NULL,
    "type" "CheckInTemplateType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" TEXT,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "week_number" INTEGER,
    "tags" JSONB DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_in_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "check_in_templates_accompagnement_product_id_idx" ON "check_in_templates"("accompagnement_product_id");
CREATE INDEX IF NOT EXISTS "check_in_templates_accompagnement_product_id_type_idx" ON "check_in_templates"("accompagnement_product_id", "type");
CREATE INDEX IF NOT EXISTS "check_in_templates_accompagnement_product_id_week_number_idx" ON "check_in_templates"("accompagnement_product_id", "week_number");

ALTER TABLE "check_in_templates"
  DROP CONSTRAINT IF EXISTS "check_in_templates_accompagnement_product_id_fkey";
ALTER TABLE "check_in_templates"
  ADD CONSTRAINT "check_in_templates_accompagnement_product_id_fkey"
  FOREIGN KEY ("accompagnement_product_id") REFERENCES "accompagnement_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DailyCheckIn
CREATE TABLE IF NOT EXISTS "daily_check_ins" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "email_message_id" TEXT,
    "status" "CheckInStatus" NOT NULL DEFAULT 'SCHEDULED',
    "ai_selected_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_check_ins_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "daily_check_ins_enrollment_id_idx" ON "daily_check_ins"("enrollment_id");
CREATE INDEX IF NOT EXISTS "daily_check_ins_enrollment_id_scheduled_for_idx" ON "daily_check_ins"("enrollment_id", "scheduled_for");
CREATE INDEX IF NOT EXISTS "daily_check_ins_status_idx" ON "daily_check_ins"("status");
CREATE INDEX IF NOT EXISTS "daily_check_ins_scheduled_for_status_idx" ON "daily_check_ins"("scheduled_for", "status");

ALTER TABLE "daily_check_ins"
  DROP CONSTRAINT IF EXISTS "daily_check_ins_enrollment_id_fkey";
ALTER TABLE "daily_check_ins"
  ADD CONSTRAINT "daily_check_ins_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "accompagnement_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_check_ins"
  DROP CONSTRAINT IF EXISTS "daily_check_ins_template_id_fkey";
ALTER TABLE "daily_check_ins"
  ADD CONSTRAINT "daily_check_ins_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "check_in_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckInResponse
CREATE TABLE IF NOT EXISTS "check_in_responses" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "daily_check_in_id" TEXT NOT NULL,
    "raw_email_content" TEXT NOT NULL,
    "parsed_answer" TEXT,
    "ai_classification" JSONB,
    "score" INTEGER,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_in_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "check_in_responses_daily_check_in_id_key" ON "check_in_responses"("daily_check_in_id");

ALTER TABLE "check_in_responses"
  DROP CONSTRAINT IF EXISTS "check_in_responses_daily_check_in_id_fkey";
ALTER TABLE "check_in_responses"
  ADD CONSTRAINT "check_in_responses_daily_check_in_id_fkey"
  FOREIGN KEY ("daily_check_in_id") REFERENCES "daily_check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WeeklyEmailLog
CREATE TABLE IF NOT EXISTS "weekly_email_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" TEXT NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "week_end_date" TIMESTAMP(3) NOT NULL,
    "email_message_id" TEXT,
    "content_summary" JSONB,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_email_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "weekly_email_logs_enrollment_id_idx" ON "weekly_email_logs"("enrollment_id");
CREATE INDEX IF NOT EXISTS "weekly_email_logs_enrollment_id_week_start_date_idx" ON "weekly_email_logs"("enrollment_id", "week_start_date");

ALTER TABLE "weekly_email_logs"
  DROP CONSTRAINT IF EXISTS "weekly_email_logs_enrollment_id_fkey";
ALTER TABLE "weekly_email_logs"
  ADD CONSTRAINT "weekly_email_logs_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "accompagnement_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
