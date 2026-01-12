-- ============================================================================
-- Le Dojo Financier - Row Level Security (RLS) Policies
-- ============================================================================
-- Purpose: Enable RLS and create security policies for all tables
-- This ensures data security at the database level
-- ============================================================================
-- 
-- IMPORTANT: This migration enables RLS on all tables and creates policies
-- based on user roles (ADMIN, INSTRUCTOR, STUDENT) and data ownership.
-- 
-- Access Patterns:
-- - ADMIN: Full access to all data
-- - INSTRUCTOR: Access to their cohorts and related data
-- - STUDENT: Access to their own data and enrolled courses/cohorts
-- - Public: Published courses, blog articles, course categories
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Create Helper Functions
-- ----------------------------------------------------------------------------

-- Get current user's Supabase ID mapped to Prisma user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
  SELECT id FROM users WHERE supabase_id = auth.uid()::TEXT LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role = 'ADMIN'::"UserRole" FROM users WHERE supabase_id = auth.uid()::TEXT),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user is instructor
CREATE OR REPLACE FUNCTION is_instructor()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role = 'INSTRUCTOR'::"UserRole" FROM users WHERE supabase_id = auth.uid()::TEXT),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user is admin or instructor
CREATE OR REPLACE FUNCTION is_admin_or_instructor()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('ADMIN'::"UserRole", 'INSTRUCTOR'::"UserRole") FROM users WHERE supabase_id = auth.uid()::TEXT),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is enrolled in a course
CREATE OR REPLACE FUNCTION is_enrolled_in_course(course_id_param TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM enrollments
    WHERE course_id = course_id_param
      AND user_id = get_current_user_id()
      AND expires_at > NOW()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is enrolled in a cohort
CREATE OR REPLACE FUNCTION is_enrolled_in_cohort(cohort_id_param TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM cohort_enrollments
    WHERE cohort_id = cohort_id_param
      AND user_id = get_current_user_id()
      AND expires_at > NOW()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is instructor of a cohort
CREATE OR REPLACE FUNCTION is_cohort_instructor(cohort_id_param TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM cohorts
    WHERE id = cohort_id_param
      AND instructor_id = get_current_user_id()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- STEP 2: Enable RLS on All Tables
-- ----------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_message_reads ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- STEP 3: USERS Table Policies
-- ----------------------------------------------------------------------------

-- Admin can view all users
CREATE POLICY "admin_select_all_users" ON users
  FOR SELECT
  USING (is_admin());

-- Users can view their own profile
CREATE POLICY "users_select_own_profile" ON users
  FOR SELECT
  USING (get_current_user_id() = id);

-- Users can update their own profile
-- Note: Role and suspended_at changes should be prevented at application level
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE
  USING (get_current_user_id() = id)
  WITH CHECK (get_current_user_id() = id);

-- Admin can update any user
CREATE POLICY "admin_update_all_users" ON users
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin can insert users (for user creation)
CREATE POLICY "admin_insert_users" ON users
  FOR INSERT
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 4: COURSE_CATEGORIES Table Policies
-- ----------------------------------------------------------------------------

-- Public read access (for course catalog)
CREATE POLICY "public_select_course_categories" ON course_categories
  FOR SELECT
  USING (true);

-- Admin can manage categories
CREATE POLICY "admin_manage_course_categories" ON course_categories
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 5: COURSES Table Policies
-- ----------------------------------------------------------------------------

-- Public can view published courses
CREATE POLICY "public_select_published_courses" ON courses
  FOR SELECT
  USING (published = true);

-- Students can view courses they're enrolled in (even if not published)
CREATE POLICY "students_select_enrolled_courses" ON courses
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = courses.id
        AND enrollments.user_id = get_current_user_id()
        AND enrollments.expires_at > NOW()
    )
  );

-- Admin can manage all courses
CREATE POLICY "admin_manage_courses" ON courses
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 6: MODULES Table Policies
-- ----------------------------------------------------------------------------

-- Public can view modules of published courses
CREATE POLICY "public_select_modules_published_courses" ON modules
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM courses
      WHERE courses.id = modules.course_id
        AND courses.published = true
    )
  );

-- Students can view modules of enrolled courses
CREATE POLICY "students_select_modules_enrolled_courses" ON modules
  FOR SELECT
  USING (is_enrolled_in_course(course_id));

-- Admin can manage all modules
CREATE POLICY "admin_manage_modules" ON modules
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 7: CONTENT_ITEMS Table Policies
-- ----------------------------------------------------------------------------

-- Public can view content items of published courses
CREATE POLICY "public_select_content_items_published" ON content_items
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE modules.id = content_items.module_id
        AND courses.published = true
    )
  );

-- Students can view content items of enrolled courses
CREATE POLICY "students_select_content_items_enrolled" ON content_items
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM modules
      WHERE modules.id = content_items.module_id
        AND is_enrolled_in_course(modules.course_id)
    )
  );

-- Admin can manage all content items
CREATE POLICY "admin_manage_content_items" ON content_items
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 8: VIDEOS Table Policies
-- ----------------------------------------------------------------------------

-- Follow content_items access (through content_item_id)
CREATE POLICY "public_select_videos_published" ON videos
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM content_items
      JOIN modules ON modules.id = content_items.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE content_items.id = videos.content_item_id
        AND courses.published = true
    )
  );

CREATE POLICY "students_select_videos_enrolled" ON videos
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM content_items
      JOIN modules ON modules.id = content_items.module_id
      WHERE content_items.id = videos.content_item_id
        AND is_enrolled_in_course(modules.course_id)
    )
  );

CREATE POLICY "admin_manage_videos" ON videos
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 9: QUIZZES Table Policies
-- ----------------------------------------------------------------------------

-- Follow content_items access
CREATE POLICY "public_select_quizzes_published" ON quizzes
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM content_items
      JOIN modules ON modules.id = content_items.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE content_items.id = quizzes.content_item_id
        AND courses.published = true
    )
  );

CREATE POLICY "students_select_quizzes_enrolled" ON quizzes
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM content_items
      JOIN modules ON modules.id = content_items.module_id
      WHERE content_items.id = quizzes.content_item_id
        AND is_enrolled_in_course(modules.course_id)
    )
  );

CREATE POLICY "admin_manage_quizzes" ON quizzes
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 10: QUIZ_QUESTIONS Table Policies
-- ----------------------------------------------------------------------------

-- Follow quizzes access
CREATE POLICY "public_select_quiz_questions_published" ON quiz_questions
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM quizzes
      JOIN content_items ON content_items.id = quizzes.content_item_id
      JOIN modules ON modules.id = content_items.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE quizzes.id = quiz_questions.quiz_id
        AND courses.published = true
    )
  );

CREATE POLICY "students_select_quiz_questions_enrolled" ON quiz_questions
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM quizzes
      JOIN content_items ON content_items.id = quizzes.content_item_id
      JOIN modules ON modules.id = content_items.module_id
      WHERE quizzes.id = quiz_questions.quiz_id
        AND is_enrolled_in_course(modules.course_id)
    )
  );

CREATE POLICY "admin_manage_quiz_questions" ON quiz_questions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 11: QUIZ_ATTEMPTS Table Policies
-- ----------------------------------------------------------------------------

-- Students can view and create their own quiz attempts
CREATE POLICY "students_manage_own_quiz_attempts" ON quiz_attempts
  FOR ALL
  USING (get_current_user_id() = user_id)
  WITH CHECK (get_current_user_id() = user_id);

-- Admin can view all quiz attempts
CREATE POLICY "admin_select_all_quiz_attempts" ON quiz_attempts
  FOR SELECT
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 12: FLASHCARDS Table Policies
-- ----------------------------------------------------------------------------

-- Public can view flashcards of published courses
CREATE POLICY "public_select_flashcards_published" ON flashcards
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM courses
      WHERE courses.id = flashcards.course_id
        AND courses.published = true
    )
  );

-- Students can view flashcards of enrolled courses
CREATE POLICY "students_select_flashcards_enrolled" ON flashcards
  FOR SELECT
  USING (is_enrolled_in_course(course_id));

-- Admin can manage all flashcards
CREATE POLICY "admin_manage_flashcards" ON flashcards
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 13: FLASHCARD_STUDY_SESSIONS Table Policies
-- ----------------------------------------------------------------------------

-- Students can manage their own study sessions
CREATE POLICY "students_manage_own_study_sessions" ON flashcard_study_sessions
  FOR ALL
  USING (get_current_user_id() = user_id)
  WITH CHECK (get_current_user_id() = user_id);

-- Admin can view all study sessions
CREATE POLICY "admin_select_all_study_sessions" ON flashcard_study_sessions
  FOR SELECT
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 14: NOTES Table Policies
-- ----------------------------------------------------------------------------

-- Admin notes: Admin can manage, students can view if enrolled
CREATE POLICY "admin_manage_admin_notes" ON notes
  FOR ALL
  USING (
    type = 'ADMIN'::"NoteType" AND is_admin()
  )
  WITH CHECK (
    type = 'ADMIN'::"NoteType" AND is_admin()
  );

CREATE POLICY "students_select_admin_notes_enrolled" ON notes
  FOR SELECT
  USING (
    type = 'ADMIN'::"NoteType" AND
    content_item_id IS NOT NULL AND
    EXISTS(
      SELECT 1 FROM content_items
      JOIN modules ON modules.id = content_items.module_id
      WHERE content_items.id = notes.content_item_id
        AND is_enrolled_in_course(modules.course_id)
    )
  );

-- Student notes: Students can manage their own
CREATE POLICY "students_manage_own_notes" ON notes
  FOR ALL
  USING (
    type = 'STUDENT'::"NoteType" AND
    get_current_user_id() = user_id
  )
  WITH CHECK (
    type = 'STUDENT'::"NoteType" AND
    get_current_user_id() = user_id
  );

-- Admin can view all notes
CREATE POLICY "admin_select_all_notes" ON notes
  FOR SELECT
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 15: ENROLLMENTS Table Policies
-- ----------------------------------------------------------------------------

-- Students can view their own enrollments
CREATE POLICY "students_select_own_enrollments" ON enrollments
  FOR SELECT
  USING (get_current_user_id() = user_id);

-- Admin can manage all enrollments
CREATE POLICY "admin_manage_enrollments" ON enrollments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Service role can insert enrollments (for webhook processing)
-- Note: This requires service_role key, not handled by RLS

-- ----------------------------------------------------------------------------
-- STEP 16: SUBSCRIPTIONS Table Policies
-- ----------------------------------------------------------------------------

-- Students can view their own subscriptions
CREATE POLICY "students_select_own_subscriptions" ON subscriptions
  FOR SELECT
  USING (get_current_user_id() = user_id);

-- Admin can manage all subscriptions
CREATE POLICY "admin_manage_subscriptions" ON subscriptions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 17: PROGRESS_TRACKING Table Policies
-- ----------------------------------------------------------------------------

-- Students can manage their own progress
CREATE POLICY "students_manage_own_progress" ON progress_tracking
  FOR ALL
  USING (get_current_user_id() = user_id)
  WITH CHECK (get_current_user_id() = user_id);

-- Admin can view all progress
CREATE POLICY "admin_select_all_progress" ON progress_tracking
  FOR SELECT
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 18: ANALYTICS Table Policies
-- ----------------------------------------------------------------------------

-- Admin only access
CREATE POLICY "admin_manage_analytics" ON analytics
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 19: MESSAGES Table Policies
-- ----------------------------------------------------------------------------

-- Students can view messages in their own threads
CREATE POLICY "students_select_own_messages" ON messages
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM message_threads
      WHERE message_threads.id = messages.thread_id
        AND message_threads.user_id = get_current_user_id()
    )
  );

-- Students can create messages in their own threads
CREATE POLICY "students_insert_own_messages" ON messages
  FOR INSERT
  WITH CHECK (
    get_current_user_id() = user_id AND
    EXISTS(
      SELECT 1 FROM message_threads
      WHERE message_threads.id = messages.thread_id
        AND message_threads.user_id = get_current_user_id()
    )
  );

-- Admin can view all messages
CREATE POLICY "admin_select_all_messages" ON messages
  FOR SELECT
  USING (is_admin());

-- Admin can insert messages (for replies)
CREATE POLICY "admin_insert_messages" ON messages
  FOR INSERT
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 20: MESSAGE_THREADS Table Policies
-- ----------------------------------------------------------------------------

-- Students can manage their own threads
CREATE POLICY "students_manage_own_threads" ON message_threads
  FOR ALL
  USING (get_current_user_id() = user_id)
  WITH CHECK (get_current_user_id() = user_id);

-- Admin can view all threads
CREATE POLICY "admin_select_all_threads" ON message_threads
  FOR SELECT
  USING (is_admin());

-- Admin can update threads (for status changes)
CREATE POLICY "admin_update_threads" ON message_threads
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 21: APPOINTMENTS Table Policies
-- ----------------------------------------------------------------------------

-- Students can view and create their own appointments
CREATE POLICY "students_manage_own_appointments" ON appointments
  FOR ALL
  USING (get_current_user_id() = user_id)
  WITH CHECK (get_current_user_id() = user_id);

-- Admin can manage all appointments
CREATE POLICY "admin_manage_appointments" ON appointments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 22: APPOINTMENT_AVAILABILITY Table Policies (DEPRECATED)
-- ----------------------------------------------------------------------------

-- Admin only
CREATE POLICY "admin_manage_appointment_availability" ON appointment_availability
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 23: AVAILABILITY_RULES Table Policies
-- ----------------------------------------------------------------------------

-- Admin can manage all availability rules
CREATE POLICY "admin_manage_availability_rules" ON availability_rules
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Public can view availability rules (for booking interface)
CREATE POLICY "public_select_availability_rules" ON availability_rules
  FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- STEP 24: AVAILABILITY_EXCEPTIONS Table Policies
-- ----------------------------------------------------------------------------

-- Admin can manage all availability exceptions
CREATE POLICY "admin_manage_availability_exceptions" ON availability_exceptions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Public can view availability exceptions (for booking interface)
CREATE POLICY "public_select_availability_exceptions" ON availability_exceptions
  FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- STEP 25: BLOG_ARTICLES Table Policies
-- ----------------------------------------------------------------------------

-- Public can view published blog articles
CREATE POLICY "public_select_published_blog_articles" ON blog_articles
  FOR SELECT
  USING (status = 'PUBLISHED'::"BlogStatus");

-- Admin can manage all blog articles
CREATE POLICY "admin_manage_blog_articles" ON blog_articles
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 26: COUPONS Table Policies
-- ----------------------------------------------------------------------------

-- Public can view active coupons (for validation)
CREATE POLICY "public_select_active_coupons" ON coupons
  FOR SELECT
  USING (
    active = true
    AND NOW() >= valid_from
    AND NOW() <= valid_until
  );

-- Admin can manage all coupons
CREATE POLICY "admin_manage_coupons" ON coupons
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 27: COUPON_USAGE Table Policies
-- ----------------------------------------------------------------------------

-- Students can view their own coupon usage (through enrollments)
CREATE POLICY "students_select_own_coupon_usage" ON coupon_usage
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM enrollments
      WHERE enrollments.id = coupon_usage.enrollment_id
        AND enrollments.user_id = get_current_user_id()
    )
  );

-- Admin can manage all coupon usage
CREATE POLICY "admin_manage_coupon_usage" ON coupon_usage
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 28: SUPPORT_TICKETS Table Policies
-- ----------------------------------------------------------------------------

-- Students can view and create their own tickets
CREATE POLICY "students_manage_own_tickets" ON support_tickets
  FOR ALL
  USING (
    get_current_user_id() = student_id AND
    EXISTS(
      SELECT 1 FROM users
      WHERE users.id = get_current_user_id()
        AND users.role = 'STUDENT'::"UserRole"
    )
  )
  WITH CHECK (
    get_current_user_id() = student_id AND
    EXISTS(
      SELECT 1 FROM users
      WHERE users.id = get_current_user_id()
        AND users.role = 'STUDENT'::"UserRole"
    )
  );

-- Admin can manage all tickets
CREATE POLICY "admin_manage_tickets" ON support_tickets
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 29: SUPPORT_TICKET_REPLIES Table Policies
-- ----------------------------------------------------------------------------

-- Students can view replies to their own tickets
CREATE POLICY "students_select_own_ticket_replies" ON support_ticket_replies
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_replies.ticket_id
        AND support_tickets.student_id = get_current_user_id()
    )
  );

-- Students can create replies to their own tickets
CREATE POLICY "students_insert_own_ticket_replies" ON support_ticket_replies
  FOR INSERT
  WITH CHECK (
    get_current_user_id() = author_id AND
    author_role = 'STUDENT'::"UserRole" AND
    EXISTS(
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_replies.ticket_id
        AND support_tickets.student_id = get_current_user_id()
    )
  );

-- Admin can manage all replies
CREATE POLICY "admin_manage_ticket_replies" ON support_ticket_replies
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 30: ERROR_LOGS Table Policies
-- ----------------------------------------------------------------------------

-- Admin only access
CREATE POLICY "admin_manage_error_logs" ON error_logs
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow users to insert their own error logs (for client-side error logging)
CREATE POLICY "users_insert_own_error_logs" ON error_logs
  FOR INSERT
  WITH CHECK (
    user_id IS NULL OR
    get_current_user_id() = user_id
  );

-- ----------------------------------------------------------------------------
-- STEP 31: COHORTS Table Policies
-- ----------------------------------------------------------------------------

-- Public can view published cohorts
CREATE POLICY "public_select_published_cohorts" ON cohorts
  FOR SELECT
  USING (published = true);

-- Students can view cohorts they're enrolled in
CREATE POLICY "students_select_enrolled_cohorts" ON cohorts
  FOR SELECT
  USING (is_enrolled_in_cohort(id));

-- Instructors can view and manage their own cohorts
CREATE POLICY "instructors_manage_own_cohorts" ON cohorts
  FOR ALL
  USING (
    is_instructor() AND
    instructor_id = get_current_user_id()
  )
  WITH CHECK (
    is_instructor() AND
    instructor_id = get_current_user_id()
  );

-- Admin can manage all cohorts
CREATE POLICY "admin_manage_cohorts" ON cohorts
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 32: COHORT_MODULES Table Policies
-- ----------------------------------------------------------------------------

-- Follow cohorts access
CREATE POLICY "public_select_cohort_modules_published" ON cohort_modules
  FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM cohorts
      WHERE cohorts.id = cohort_modules.cohort_id
        AND cohorts.published = true
    )
  );

CREATE POLICY "students_select_cohort_modules_enrolled" ON cohort_modules
  FOR SELECT
  USING (is_enrolled_in_cohort(cohort_id));

CREATE POLICY "instructors_manage_cohort_modules" ON cohort_modules
  FOR ALL
  USING (
    is_instructor() AND
    is_cohort_instructor(cohort_id)
  )
  WITH CHECK (
    is_instructor() AND
    is_cohort_instructor(cohort_id)
  );

CREATE POLICY "admin_manage_cohort_modules" ON cohort_modules
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 33: COHORT_ENROLLMENTS Table Policies
-- ----------------------------------------------------------------------------

-- Students can view their own cohort enrollments
CREATE POLICY "students_select_own_cohort_enrollments" ON cohort_enrollments
  FOR SELECT
  USING (get_current_user_id() = user_id);

-- Admin and instructors can manage enrollments for their cohorts
CREATE POLICY "instructors_manage_cohort_enrollments" ON cohort_enrollments
  FOR ALL
  USING (
    is_instructor() AND
    is_cohort_instructor(cohort_id)
  )
  WITH CHECK (
    is_instructor() AND
    is_cohort_instructor(cohort_id)
  );

CREATE POLICY "admin_manage_cohort_enrollments" ON cohort_enrollments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 34: GROUP_COACHING_SESSIONS Table Policies
-- ----------------------------------------------------------------------------

-- Students can view sessions for enrolled cohorts
CREATE POLICY "students_select_cohort_sessions" ON group_coaching_sessions
  FOR SELECT
  USING (is_enrolled_in_cohort(cohort_id));

-- Instructors can manage sessions for their cohorts
CREATE POLICY "instructors_manage_cohort_sessions" ON group_coaching_sessions
  FOR ALL
  USING (
    is_instructor() AND
    is_cohort_instructor(cohort_id)
  )
  WITH CHECK (
    is_instructor() AND
    is_cohort_instructor(cohort_id)
  );

-- Admin can manage all sessions
CREATE POLICY "admin_manage_cohort_sessions" ON group_coaching_sessions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 35: COHORT_MESSAGES Table Policies
-- ----------------------------------------------------------------------------

-- Students can view and create messages in enrolled cohorts
CREATE POLICY "students_manage_cohort_messages" ON cohort_messages
  FOR ALL
  USING (
    is_enrolled_in_cohort(cohort_id) AND
    (get_current_user_id() = author_id OR NOT pinned)
  )
  WITH CHECK (
    is_enrolled_in_cohort(cohort_id) AND
    get_current_user_id() = author_id
  );

-- Instructors can manage messages in their cohorts (including pinning)
CREATE POLICY "instructors_manage_cohort_messages" ON cohort_messages
  FOR ALL
  USING (
    is_instructor() AND
    is_cohort_instructor(cohort_id)
  )
  WITH CHECK (
    is_instructor() AND
    is_cohort_instructor(cohort_id)
  );

-- Admin can manage all messages
CREATE POLICY "admin_manage_cohort_messages" ON cohort_messages
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------------------------------------------------------
-- STEP 36: COHORT_MESSAGE_READS Table Policies
-- ----------------------------------------------------------------------------

-- Students can manage their own read status
CREATE POLICY "students_manage_own_message_reads" ON cohort_message_reads
  FOR ALL
  USING (get_current_user_id() = user_id)
  WITH CHECK (get_current_user_id() = user_id);

-- Admin can view all read statuses
CREATE POLICY "admin_select_message_reads" ON cohort_message_reads
  FOR SELECT
  USING (is_admin());

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
-- 
-- Notes:
-- 1. All policies use helper functions for performance and consistency
-- 2. Service role operations (webhooks) bypass RLS automatically
-- 3. Policies are designed to allow:
--    - Public access to published content
--    - Student access to enrolled content
--    - Instructor access to their cohorts
--    - Admin access to everything
-- 4. Test thoroughly after applying these policies!
-- ============================================================================

