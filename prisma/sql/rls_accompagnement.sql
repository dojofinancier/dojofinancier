-- ============================================================================
-- Row Level Security — Accompagnement (ERCI) tables
-- ============================================================================
-- Prerequisites: functions get_current_user_id() and is_admin() from
-- prisma/rls-policies.sql must already exist on the database.
--
-- Run in Supabase SQL Editor, or: supabase db execute < prisma/sql/rls_accompagnement.sql
-- Idempotent: drops policies by name before recreating.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------

ALTER TABLE accompagnement_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE accompagnement_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE accompagnement_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE weak_area_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_line_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_mcq ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_oeq ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- accompagnement_products
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "public_select_published_accompagnement_products" ON accompagnement_products;
DROP POLICY IF EXISTS "students_select_accompagnement_products_enrolled" ON accompagnement_products;
DROP POLICY IF EXISTS "admin_manage_accompagnement_products" ON accompagnement_products;

CREATE POLICY "public_select_published_accompagnement_products" ON accompagnement_products
  FOR SELECT
  USING (published = true);

CREATE POLICY "students_select_accompagnement_products_enrolled" ON accompagnement_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.accompagnement_product_id = accompagnement_products.id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_accompagnement_products" ON accompagnement_products
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- accompagnement_enrollments
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_accompagnement_enrollments" ON accompagnement_enrollments;
DROP POLICY IF EXISTS "students_update_own_accompagnement_enrollments" ON accompagnement_enrollments;
DROP POLICY IF EXISTS "admin_manage_accompagnement_enrollments" ON accompagnement_enrollments;

CREATE POLICY "students_select_own_accompagnement_enrollments" ON accompagnement_enrollments
  FOR SELECT
  USING (user_id = get_current_user_id());

CREATE POLICY "students_update_own_accompagnement_enrollments" ON accompagnement_enrollments
  FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "admin_manage_accompagnement_enrollments" ON accompagnement_enrollments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- accompagnement_onboardings
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_accompagnement_onboardings" ON accompagnement_onboardings;
DROP POLICY IF EXISTS "students_insert_own_accompagnement_onboardings" ON accompagnement_onboardings;
DROP POLICY IF EXISTS "students_update_own_accompagnement_onboardings" ON accompagnement_onboardings;
DROP POLICY IF EXISTS "admin_manage_accompagnement_onboardings" ON accompagnement_onboardings;

CREATE POLICY "students_select_own_accompagnement_onboardings" ON accompagnement_onboardings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = accompagnement_onboardings.enrollment_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "students_insert_own_accompagnement_onboardings" ON accompagnement_onboardings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = enrollment_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "students_update_own_accompagnement_onboardings" ON accompagnement_onboardings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = accompagnement_onboardings.enrollment_id
        AND e.user_id = get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = enrollment_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_accompagnement_onboardings" ON accompagnement_onboardings
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- chapter_self_assessments
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_chapter_self_assessments" ON chapter_self_assessments;
DROP POLICY IF EXISTS "students_insert_own_chapter_self_assessments" ON chapter_self_assessments;
DROP POLICY IF EXISTS "students_update_own_chapter_self_assessments" ON chapter_self_assessments;
DROP POLICY IF EXISTS "admin_manage_chapter_self_assessments" ON chapter_self_assessments;

CREATE POLICY "students_select_own_chapter_self_assessments" ON chapter_self_assessments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_onboardings ob
      INNER JOIN accompagnement_enrollments e ON e.id = ob.enrollment_id
      WHERE ob.id = chapter_self_assessments.onboarding_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "students_insert_own_chapter_self_assessments" ON chapter_self_assessments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accompagnement_onboardings ob
      INNER JOIN accompagnement_enrollments e ON e.id = ob.enrollment_id
      WHERE ob.id = onboarding_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "students_update_own_chapter_self_assessments" ON chapter_self_assessments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_onboardings ob
      INNER JOIN accompagnement_enrollments e ON e.id = ob.enrollment_id
      WHERE ob.id = chapter_self_assessments.onboarding_id
        AND e.user_id = get_current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accompagnement_onboardings ob
      INNER JOIN accompagnement_enrollments e ON e.id = ob.enrollment_id
      WHERE ob.id = onboarding_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_chapter_self_assessments" ON chapter_self_assessments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- daily_check_ins
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_daily_check_ins" ON daily_check_ins;
DROP POLICY IF EXISTS "admin_manage_daily_check_ins" ON daily_check_ins;

CREATE POLICY "students_select_own_daily_check_ins" ON daily_check_ins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = daily_check_ins.enrollment_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_daily_check_ins" ON daily_check_ins
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- check_in_responses
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_check_in_responses" ON check_in_responses;
DROP POLICY IF EXISTS "admin_manage_check_in_responses" ON check_in_responses;

CREATE POLICY "students_select_own_check_in_responses" ON check_in_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_check_ins d
      INNER JOIN accompagnement_enrollments e ON e.id = d.enrollment_id
      WHERE d.id = check_in_responses.daily_check_in_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_check_in_responses" ON check_in_responses
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- check_in_answers
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_check_in_answers" ON check_in_answers;
DROP POLICY IF EXISTS "admin_manage_check_in_answers" ON check_in_answers;

CREATE POLICY "students_select_own_check_in_answers" ON check_in_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_check_ins d
      INNER JOIN accompagnement_enrollments e ON e.id = d.enrollment_id
      WHERE d.id = check_in_answers.daily_check_in_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_check_in_answers" ON check_in_answers
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- weekly_plans
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_weekly_plans" ON weekly_plans;
DROP POLICY IF EXISTS "admin_manage_weekly_plans" ON weekly_plans;

CREATE POLICY "students_select_own_weekly_plans" ON weekly_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = weekly_plans.enrollment_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_weekly_plans" ON weekly_plans
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- weekly_reviews
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_weekly_reviews" ON weekly_reviews;
DROP POLICY IF EXISTS "admin_manage_weekly_reviews" ON weekly_reviews;

CREATE POLICY "students_select_own_weekly_reviews" ON weekly_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = weekly_reviews.enrollment_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_weekly_reviews" ON weekly_reviews
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- weak_area_signals
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_weak_area_signals" ON weak_area_signals;
DROP POLICY IF EXISTS "admin_manage_weak_area_signals" ON weak_area_signals;

CREATE POLICY "students_select_own_weak_area_signals" ON weak_area_signals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = weak_area_signals.enrollment_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_weak_area_signals" ON weak_area_signals
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- weekly_email_logs
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_weekly_email_logs" ON weekly_email_logs;
DROP POLICY IF EXISTS "admin_manage_weekly_email_logs" ON weekly_email_logs;

CREATE POLICY "students_select_own_weekly_email_logs" ON weekly_email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = weekly_email_logs.enrollment_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_weekly_email_logs" ON weekly_email_logs
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- onboarding_email_logs
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "students_select_own_onboarding_email_logs" ON onboarding_email_logs;
DROP POLICY IF EXISTS "admin_manage_onboarding_email_logs" ON onboarding_email_logs;

CREATE POLICY "students_select_own_onboarding_email_logs" ON onboarding_email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accompagnement_enrollments e
      WHERE e.id = onboarding_email_logs.enrollment_id
        AND e.user_id = get_current_user_id()
    )
  );

CREATE POLICY "admin_manage_onboarding_email_logs" ON onboarding_email_logs
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- context_line_templates (admin-only via PostgREST; server jobs use service role)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_manage_context_line_templates" ON context_line_templates;

CREATE POLICY "admin_manage_context_line_templates" ON context_line_templates
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- adaptive_mcq / adaptive_oeq (read via Prisma/server; lock down direct API)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_manage_adaptive_mcq" ON adaptive_mcq;
DROP POLICY IF EXISTS "admin_manage_adaptive_oeq" ON adaptive_oeq;

CREATE POLICY "admin_manage_adaptive_mcq" ON adaptive_mcq
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admin_manage_adaptive_oeq" ON adaptive_oeq
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
