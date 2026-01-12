# Le Dojo Financier - Learning Management System
Date: December 2024 (Last Updated)

## Project Overview
A Next.js 16 LMS platform for financial education with hybrid payment model, comprehensive content types, and full analytics. Built with TypeScript, Prisma, Supabase (Auth + Postgres), Stripe payments, and deployed on Netlify.

## Architecture Decisions

### Event Processing & Automation
- **make.com Integration**: All events (orders, payments, subscriptions, forms, support tickets) are sent TO make.com for automation, notifications, and bookkeeping
- The application sends webhooks TO make.com (one-way flow: App → make.com)
- make.com handles external integrations (email, calendar, Slack, etc.) and automation workflows
- App operations (enrollments, payments, etc.) are handled directly in the app - make.com is used for auxiliary actions only
- This allows for flexible automation workflows without modifying application code

### Database Schema (Prisma + Supabase Postgres)
- **Users**: Extended Supabase auth with Prisma profile (role: student/admin/instructor)
- **Courses**: Title, description, price, accessDuration (default 1 year), paymentType (one-time/subscription), subscriptionId (Stripe), published status
- **Modules**: Belongs to course, order/sequence, title, description
- **ContentItems**: Polymorphic content (video, quiz, flashcard, note), belongs to module, order
- **Videos**: Vimeo URL, duration, transcript (optional)
- **Quizzes**: Title, passingScore, timeLimit (optional)
- **QuizQuestions**: Multiple types (multiple-choice, short-answer, true/false), question text, options, correctAnswer
- **QuizAttempts**: User attempts with score, answers, completion time
- **Flashcards**: Front/back text, belongs to course
- **FlashcardStudySessions**: User progress, card difficulty classification (easy/difficult)
- **Notes**: Admin notes (attached to content) + Student notes (personal, attached to content)
- **Enrollments**: User-course relationship, purchaseDate, expiresAt, paymentIntentId
- **Subscriptions**: Stripe subscription tracking, status, currentPeriodEnd
- **ProgressTracking**: User progress per content item, timeSpent, completedAt, lastAccessedAt
- **Analytics**: Aggregated stats (course completion rates, quiz scores, time spent)
- **Messages**: Student questions to instructors, attached to content items, sent via make.com webhook
- **MessageThreads**: Conversation threads between students and instructors
- **Appointments**: Booking system for instructor sessions, date/time, status, course/content context
- **BlogArticles**: Blog posts with title, slug, category, content, SEO fields (h1, meta_description, excerpt, tags, keywords), internal/external links, related articles, status workflow (draft_outline → draft → content_generated → links_added → published)
- **Coupons**: Discount codes with code, discountType (percentage/fixed), discountValue, applicableCourses (specific courses or all), usageLimit, usedCount, validFrom, validUntil, active status
- **CouponUsage**: Track coupon usage per enrollment (couponId, enrollmentId, discountAmount)
- **SupportTickets**: Ticket system with ticket number, subject, description, status (open, in_progress, resolved, closed), priority, category, studentId, assignedAdminId, createdAt, updatedAt
- **SupportTicketReplies**: Replies/updates on tickets (ticketId, authorId, authorRole, message, attachments, createdAt)
- **ErrorLogs**: Centralized error logging with errorId, errorType (client/server), errorMessage, stackTrace, userId, url, userAgent, severity, resolved, createdAt (90-day retention with automatic cleanup)
- **Cohorts**: Group coaching product type (separate from courses), title, description, price, maxStudents, enrollmentClosingDate, accessDuration (365 days), published status, componentVisibility settings, instructorId
- **CohortModules**: Junction table linking cohorts to existing modules (enables content sharing without duplication), cohortId, moduleId, order (cohort-specific ordering)
- **CohortEnrollments**: User-cohort relationship, purchaseDate, expiresAt, paymentIntentId (similar to course enrollments)
- **GroupCoachingSessions**: Coaching sessions for cohorts, cohortId, title, description (rich text), scheduledAt, zoomLink, teamsLink, recordingVimeoUrl, adminNotes (rich text), status (upcoming/completed)
- **CohortMessages**: Message board posts for cohorts, cohortId, authorId, content, attachments (32MB max, Supabase Storage), pinned (admin), createdAt, updatedAt
- **CohortMessageReads**: Track unread messages per user, cohortMessageId, userId, readAt (for unread counter)

### Payment Flow
- **One-time purchases**: Create PaymentIntent (with coupon discount if applied) → Client-side payment (Stripe Elements) → Confirm PaymentIntent → make.com webhook → Enrollment with expiresAt
- **Subscriptions**: Create PaymentIntent for initial payment (with coupon discount if applied) → Client-side payment (Stripe Elements) → Confirm PaymentIntent → Create Subscription → make.com webhook → Access to subscription-required courses
- **Coupon Application**: Validate coupon code → Apply discount (percentage or fixed amount) → Recalculate payment amount → Process payment with discount
- **make.com Integration**: All events (orders, forms, payments, subscriptions, student questions, support tickets) routed through make.com webhooks for processing and automation

### Content Structure
- Flexible module organization (modules can have varying granularity)
- Content items ordered within modules
- **Content Sharing**: Modules can be shared between courses and cohorts via CohortModules junction table (no duplication, efficient content reuse)
- Videos embedded via Vimeo Player API
- Quizzes support multiple question types with detailed answer tracking
- Flashcards with spaced repetition logic (easy/difficult classification)
- Notes: Admin notes (rich text) and student notes (personal, markdown)
- **Cohorts**: Group coaching products that share course content (videos, quizzes, flashcards) plus group coaching sessions and message board

### Analytics System
- Real-time progress tracking (time spent per content item)
- Quiz performance analytics (scores, attempts, question-level analysis)
- Course completion metrics
- Flashcard study statistics
- Admin dashboard with aggregate analytics

## Implementation Phases

### Phase 1: Project Foundation
- [x] 1.1. Initialize Next.js 16 project with TypeScript
- [x] 1.2. Configure Tailwind CSS v4 and shadcn/ui
- [x] 1.3. Set up Supabase project (Auth + Postgres database)
- [x] 1.4. Configure Prisma with Supabase connection
- [x] 1.5. Create database schema (all models)
- [x] 1.6. Set up Supabase SSR auth utilities
- [x] 1.7. Configure Stripe (test mode)

### Phase 2: Authentication & Authorization
- [x] 2.1. Implement Supabase Auth (email + OAuth providers)
- [x] 2.2. Create auth middleware for protected routes
- [x] 2.3. Build login/signup pages (French UI)
- [x] 2.4. Implement role-based access control (student/admin)
- [x] 2.5. Add instructor role and permissions (INSTRUCTOR role added to UserRole enum, requireInstructor auth utility created)
- [x] 2.6. Create user profile management (basic structure, full implementation in Phase 6.3)

### Phase 3: Core Database & API Layer
- [x] 3.1. Generate Prisma Client
- [x] 3.2. Create Server Actions for:
   - [x] Course CRUD (admin)
   - [x] Enrollment management (create, update, delete, extend access, revoke access)
   - [x] Content access checks
   - [x] Progress tracking
   - [x] Coupon management (create, validate, apply discounts, track usage)
   - [x] Student management (view students, suspend/activate accounts, view activity)
   - [x] Order management (view orders, order details, process refunds, manage order status)
   - [x] Financial management (view revenues, generate financial reports)
   - [x] Support ticket management (create tickets, reply, update status, assign tickets)
   - [x] Message management (send questions, receive responses)
   - [x] Appointment management (create, update, cancel bookings)
   - [x] Profile management (update user info, change password, update preferences)
   - [x] Error logging (log errors, retrieve error logs, mark errors as resolved)
   - [x] Cohort management (create, update, delete cohorts, manage enrollments, manage sessions, moderate message board) - Phase 7.9.3
- [x] 3.3. Set up centralized webhook utility for sending events TO make.com (payments, messages, appointments, support tickets, errors, cohort enrollments, cohort messages)
- [x] 3.4. Create utility functions for access validation
- [x] 3.5. Set up error handling and logging infrastructure:
   - [x] Create centralized error logging service (`lib/utils/error-logging.ts`)
   - [x] Database schema for error logs (ErrorLogs table)
   - [x] Client-side error logging to database
   - [x] Server-side error logging to database
   - [ ] Make.com webhook integration for error notifications (admin alerts) - TODO: Configure webhook URLs
   - [ ] Automatic cleanup service (90-day retention) - TODO: Implement scheduled cleanup
   - [x] Error logging Server Actions

### Phase 4: Payment Integration
- [x] 4.1. Implement Stripe Payment Intents for one-time purchases:
   - [x] Create PaymentIntent server-side
   - [x] Build payment form with Stripe Elements (client-side)
   - [x] Handle payment confirmation and success flow
- [x] 4.2. Implement Stripe Payment Intents for subscriptions:
   - [x] Create PaymentIntent for initial subscription payment
   - [x] Build payment form with Stripe Elements (client-side)
   - [x] Create subscription after successful payment
   - [x] Handle recurring subscription charges
- [x] 4.3. Set up webhook integration to send events TO make.com (payment success, subscription updates, enrollments, messages, appointments)
- [x] 4.4. Build enrollment logic (access duration calculation)
- [x] 4.5. Create subscription status checks
- [x] 4.6. Build payment history page (student-facing)
- [x] 4.7. Integrate Stripe refund API for admin refund processing
- [x] 4.8. Implement coupon code functionality (courses):
   - [x] Coupon validation (check validity, expiration, usage limits)
   - [x] Apply coupon discount to PaymentIntent (percentage or fixed amount)
   - [x] Coupon code input field in payment form
   - [x] Display discount amount and final price
   - [x] Track coupon usage per enrollment

### Phase 5: Admin Dashboard
- [x] 5.1. Course management (create/edit/delete courses)
- [x] 5.2. Module management (drag-and-drop ordering)
- [x] 5.3. Content item management (videos, quizzes, flashcards, notes)
- [x] 5.4. Quiz builder (multiple question types)
- [x] 5.5. Flashcard set creation
- [x] 5.6. Course pricing and access duration configuration
- [x] 5.7. Coupon code management:
   - [x] Create coupon codes (percentage or fixed dollar discount)
   - [x] Set discount value and type
   - [x] Configure applicable courses (specific courses or all courses)
   - [x] Set usage limits (total uses, per-user limit)
   - [x] Set validity dates (valid from/until)
   - [x] Activate/deactivate coupons
   - [x] View coupon usage statistics
   - [x] Edit/delete coupons
- [x] 5.8. Student management interface:
   - [x] View all students list (with search and filters)
   - [x] View student details (profile, enrollments, progress, activity)
   - [x] View student actions/activity log
   - [x] Revoke course access (remove enrollments)
   - [x] Extend course access (modify enrollment expiration dates)
   - [x] Suspend/activate student accounts
   - [x] View student progress across all enrolled courses
   - [x] Manage student subscriptions
- [x] 5.9. Message management interface (view and respond to student questions)
- [x] 5.10. Support ticket management interface:
   - [x] View all support tickets (with filters: status, priority, category, assigned admin)
   - [x] View ticket details and conversation thread
   - [x] Assign tickets to admins
   - [x] Reply to tickets
   - [x] Update ticket status (open, in_progress, resolved, closed)
   - [x] Set ticket priority
   - [x] Categorize tickets
   - [x] View ticket statistics and metrics
   - [x] Search tickets by ticket number, student, subject
- [x] 5.11. Appointment management interface (view bookings, set availability, manage calendar)
- [x] 5.12. Order management interface:
   - [x] View all orders/transactions (with search and filters: date range, student, course, payment type, status)
   - [x] View order details (order ID, student info, course, payment amount, payment method, transaction date, coupon used, enrollment status)
   - [x] Issue refunds (full or partial refunds via Stripe API)
   - [x] View refund history and status
   - [x] Filter orders by status (completed, pending, refunded, failed)
   - [x] Export orders to CSV
   - [x] Order status management
   - [x] View payment method details
   - [x] Link to related enrollment and student profile
- [x] 5.13. Financials management interface:
   - [x] Revenue dashboard (total revenue, revenue by period, revenue by course)
   - [x] Subscription revenue tracking (active subscriptions, recurring revenue, churn)
   - [x] Payment methods overview
   - [x] Financial reports and exports (CSV)
   - [x] Revenue trends and charts
   - [x] Outstanding payments tracking
- [x] 5.14. Analytics dashboard (enrollments, completion rates, revenue)

### Phase 6: Student Course Experience
- [x] 6.1. Course catalog/browse page
- [x] 6.2. Course detail page with enrollment CTA
- [x] 6.3. Student dashboard:
   - [x] Profile management section:
     - [x] Edit personal information (name, email, phone, etc.)
     - [x] Change password
     - [x] Update preferences and settings
     - [x] View account details
   - [x] Course learning interface:
     - [x] Module navigation sidebar
     - [x] Video player (Vimeo embed)
     - [x] Quiz interface with multiple question types
     - [x] Flashcard study interface (easy/difficult buttons)
     - [x] Notes viewer (admin + personal)
     - [x] Messaging interface for instructor questions
     - [x] Appointment booking interface
   - [x] Progress indicator per module/course
   - [x] Course completion tracking
   - [x] Support ticket system:
     - [x] Create new support tickets
     - [x] View ticket list (filter by status, priority)
     - [x] View ticket details and conversation thread
     - [x] Reply to tickets
     - [x] Attach files to tickets
     - [x] Track ticket status
- [x] 6.4. Dashboard navigation and layout (tabs/sections for profile, courses, progress, support, etc.)

### Phase 7: Content Components
- [x] 7.1. Video player component (Vimeo integration)
- [x] 7.2. Quiz component:
   - [x] Multiple choice questions
   - [x] Short answer questions
   - [x] True/false questions
   - [x] Answer submission and feedback
   - [x] Score calculation
- [x] 7.3. Flashcard component:
   - [x] Flip animation
   - [x] Easy/Difficult classification
   - [x] Study session tracking
- [x] 7.4. Notes component:
   - [x] Admin notes display (rich text)
   - [x] Student notes editor (markdown)
   - [x] Notes attached to content items
- [x] 7.5. Messaging system component:
   - [x] Floating button on content items (except quizzes/exams)
   - [x] Rich text editor (Tiptap) for message composition
   - [x] File attachments (32MB max, upload to Supabase Storage)
   - [x] Send questions via make.com webhook to instructors (TODO: configure webhook URL)
   - [x] Display instructor responses in conversation thread
   - [x] Message thread management and notifications
- [x] 7.6. Appointment booking component:
   - [x] Separate section in student dashboard
   - [x] Admin sets availability slots (60min, 90min, or 120min duration)
   - [x] Month view calendar (Eastern Time) - Server actions ready, UI components needed
   - [x] Hourly rate configuration (admin sets rate per course)
   - [x] Price calculation based on duration and rate
   - [x] Checkout flow for appointment payment
   - [x] Redirect to dashboard after payment confirmation
   - [x] Send booking requests via make.com webhook (TODO: configure webhook URL)
- [x] 7.7. Component visibility toggles (admin control):
   - [x] Add visibility settings to Course model (videos, quizzes, flashcards, notes, messaging, appointments, virtual tutor)
   - [x] Admin interface in course edit form to toggle component visibility
   - [x] Student interface respects visibility settings (hide completely when disabled)
- [ ] 7.8. Virtual tutor functionality (v2 - placeholder for future development)

### Phase 7.9: Cohort System (Group Coaching)
- [x] 7.9.1. Database schema updates:
   - [x] Add INSTRUCTOR role to UserRole enum
   - [x] Create Cohort model (title, description, price, maxStudents, enrollmentClosingDate, accessDuration, published, componentVisibility, instructorId)
   - [x] Create CohortModule junction table (cohortId, moduleId, order) for content sharing
   - [x] Create CohortEnrollment model (similar to Enrollment)
   - [x] Create GroupCoachingSession model (cohortId, title, description, scheduledAt, zoomLink, teamsLink, recordingVimeoUrl, adminNotes, status)
   - [x] Create CohortMessage model (cohortId, authorId, content, attachments, pinned, createdAt, updatedAt)
   - [x] Create CohortMessageRead model (cohortMessageId, userId, readAt) for unread tracking
   - [x] Update User model relations (cohortEnrollments, groupCoachingSessions, cohortMessages, cohortMessageReads)
   - [x] Update Module model to include cohortModules relation
- [x] 7.9.2. Instructor role and permissions:
   - [x] Add INSTRUCTOR to UserRole enum
   - [x] Create requireInstructor auth utility
   - [x] Update middleware to handle instructor role
   - [x] Instructor can manage cohorts (create, edit, delete)
   - [x] Instructor can manage group coaching sessions
   - [x] Instructor can moderate message board (pin, edit, delete posts)
- [x] 7.9.3. Cohort Server Actions:
   - [x] Cohort CRUD (create, read, update, delete) - admin and instructor
   - [x] Cohort enrollment management (create, extend access, revoke access)
   - [x] Cohort content management (add/remove modules from cohort, reorder modules)
   - [x] Group coaching session management (create, update, delete sessions)
   - [x] Cohort message board actions (create post, edit post, delete post, pin post, search messages)
   - [x] Unread message tracking (mark as read, get unread count)
   - [x] Cohort access validation (check enrollment, max students, enrollment closing date)
- [x] 7.9.4. Payment integration for cohorts:
   - [x] Update checkout flow to support cohort purchases
   - [x] Cohort enrollment via PaymentIntent (one-time purchase only)
   - [x] Check max students before allowing enrollment
   - [x] Check enrollment closing date before allowing enrollment
   - [x] make.com webhook for cohort enrollments
- [x] 7.9.5. Admin cohort management interface:
   - [x] Separate "Cohortes" tab in admin dashboard
   - [x] Cohort list view (with search and filters)
   - [x] Create/edit cohort form (title, description, price, maxStudents, enrollmentClosingDate, instructor assignment, component visibility)
   - [x] Add existing modules to cohort (select from course modules, set order)
   - [x] Remove/reorder modules in cohort
   - [x] Group coaching session management (create, edit, delete sessions, upload recordings)
   - [x] Message board moderation (view posts, pin, edit, delete)
   - [x] Cohort enrollment management (view enrolled students, extend/revoke access)
- [x] 7.9.6. Student cohort dashboard:
   - [x] Separate route `/cohorts/[slug]` for cohort learning interface
   - [x] Display cohort modules and content (shared from courses)
   - [x] Group coaching sessions section:
     - [x] List of sessions (upcoming and completed)
     - [x] Upcoming sessions show Zoom/Teams link
     - [x] Completed sessions show Vimeo recording embed
     - [x] Admin/instructor notes displayed per session
   - [x] Message board section:
     - [x] Linear feed of messages
     - [x] Create new post (rich text editor, file attachments up to 32MB)
     - [x] Edit/delete own posts
     - [x] Search functionality
     - [x] Unread message counter badge
     - [x] Mark messages as read
   - [x] Component visibility respected (hide disabled components)
   - [x] Progress tracking (same as courses)
- [x] 7.9.7. Student dashboard updates:
   - [x] Show cohorts alongside courses in "My Courses" section
   - [x] Distinguish between courses and cohorts in UI
   - [x] Link to cohort dashboard from course list
- [x] 7.9.8. make.com webhook integration:
  - [x] Send webhooks TO make.com for new cohort enrollments (notifications, welcome emails)
  - [x] Send webhooks TO make.com for new message board posts (notifications)

### Phase 8: Blog System & Content Generation
- [x] 8.1. Create blog articles database schema (BlogArticle model created with all required fields)
- [ ] 8.2. Build blog content generation workflow (reference CONTENT_GENERATION_STRATEGY.md and CONTENT_QUICKSTART_CHECKLIST.md):
   - [ ] Phase 1: Initial data upload (CSV → database with proper slug generation using NFD normalization)
   - [ ] Phase 2: Outline generation (using gpt-5-nano with two-step process: generate + improve)
   - [ ] Phase 3: Content generation (using gpt-5-nano with high reasoning effort)
   - [ ] Phase 4: Quality control (grammar checking with gpt-5-nano)
   - [ ] Phase 5: Enrichment (internal links, related articles, external links via Perplexity AI)
   - [ ] Phase 6: Publishing workflow
- [ ] 8.3. Create Python scripts for content generation (following CONTENT_GENERATION_STRATEGY.md):
   - [ ] Upload script with UTF-8 encoding and NFD slug normalization
   - [ ] Outline generation script with validation
   - [ ] Article generation script with retry logic
   - [ ] Grammar check script
   - [ ] Link enrichment scripts (internal, related, external)
   - [ ] Publishing script
- [ ] 8.4. Build blog frontend:
   - [ ] Blog listing page (category filtering, pagination)
   - [ ] Blog article detail page (SEO-optimized)
   - [ ] Related articles section
   - [ ] Category pages
- [ ] 8.5. Build admin blog management interface:
   - [ ] Article list view with status filtering
   - [ ] Article editor (view/edit generated content)
   - [ ] Content generation controls (trigger generation workflows)
   - [ ] Publishing controls
   - [ ] Analytics dashboard for blog articles
- [ ] 8.6. Integrate content generation scripts with admin dashboard (trigger from UI)
- [ ] 8.7. Set up monitoring and logging for content generation process

### Phase 9: Error Handling & Logging
- [x] 9.1. Error Boundaries Implementation:
  - [x] Create `ErrorBoundary` component with fallback UI (French messages)
  - [x] Add error.tsx files for major sections (dashboard, courses, checkout, cohorts, learn)
  - [x] Add global error.tsx for root layout
  - [x] Error boundaries show user-friendly French messages with support email
  - [x] Error boundaries provide reset/reload functionality
- [x] 9.2. Component-Level Error Handling:
  - [x] Implement try-catch blocks in all Server Actions and API routes
  - [x] Add loading states to all interactive components
  - [x] Create automatic retry utility with exponential backoff (`lib/utils/retry.ts`)
  - [x] User-friendly error messages in French throughout application
  - [x] Offline state detection and UI indicator (`components/error/offline-indicator.tsx`)
- [x] 9.3. Centralized Error Logging:
  - [x] Implement error logging service (`lib/utils/error-logging.ts`)
  - [x] Log all client-side errors to database (ErrorLogs table)
  - [x] Log all server-side errors to database
  - [x] Send Make.com webhook for HIGH/CRITICAL errors (admin notifications) - Configure `MAKE_WEBHOOK_ERRORS_URL` env variable
  - [x] 90-day retention with automatic cleanup script (`scripts/cleanup-error-logs.ts`) - Run via cron job
  - [x] Error severity classification (low, medium, high, critical)
- [x] 9.4. Error Recovery:
  - [x] Automatic retry logic for failed operations (exponential backoff) - `lib/utils/retry.ts`
  - [x] Error boundaries provide reset/reload functionality
  - [x] Support email displayed in all error messages
  - [x] Admin error log viewer in dashboard (`components/admin/error-logs/error-log-viewer.tsx`)

### Phase 10: Analytics & Progress Tracking
- [x] 10.1. Real-time progress tracking:
   - [x] Time spent per content item
   - [x] Completion status
   - [x] Last accessed timestamps
- [x] 10.2. Quiz analytics:
   - [x] Attempt history
   - [x] Score trends
   - [x] Question-level performance
- [x] 10.3. Flashcard analytics:
   - [x] Cards studied
   - [x] Difficulty distribution
   - [x] Study session frequency
- [ ] 10.4. Student analytics dashboard (analytics view within student dashboard):
   - [ ] Overview section (summary cards, quick stats, recent activity)
   - [ ] Course progress section (per course detailed metrics)
   - [ ] Performance analytics (quiz trends, module performance, weak areas)
   - [ ] Study habits (time patterns, adherence to study plan)
   - [ ] Goals & achievements (study plan goals, milestones, badges)
- [x] 10.5. Admin analytics dashboard (basic):
   - [x] Course-level metrics
   - [x] User engagement stats
   - [x] Revenue analytics
   - [x] Completion rates
- [ ] 10.6. Enhanced admin analytics (student usage & feature development):
   - [ ] Student usage patterns (activity timeline, feature usage, engagement score)
   - [ ] Content engagement analytics (most/least engaged content, effectiveness, heatmaps)
   - [ ] Study plan analytics (adherence rate, phase completion, success factors)
   - [ ] Performance insights (score distributions, improvement trends, at-risk students)
   - [ ] Feature usage analytics (adoption rates, effectiveness, gaps)
   - [ ] Drop-off analysis (where students stop, time to drop-off, common points)

### Phase 11: UI/UX Polish
- [x] 11.1. Responsive design (mobile-first)
- [x] 11.2. French (Canada) localization
- [x] 11.3. Loading states (complement error handling from Phase 9) Skeleton loading
- [x] 11.4. Toast notifications
- [ ] 11.5. Accessibility improvements
- [x] 11.6. Performance optimization (image optimization, code splitting)

### Phase 11.7: Performance Optimization for Learning Activities
**Status**: Phase 1 (Critical) - ✅ Completed, Phase 2 - ✅ Partially Completed, Phase 3 - Planned

#### Phase 1: Critical Optimizations (✅ Completed)
- [x] 11.7.1. Batch attempt queries (single query with `IN` clause instead of N+1 queries)
- [x] 11.7.2. Optimize Prisma queries (use `select` to limit fields, remove unnecessary `include`)
- [x] 11.7.3. Add composite database index on `LearningActivityAttempt(userId, learningActivityId, completedAt)`
- [ ] 11.7.4. Load attempts on demand (only when viewing activity) - Alternative approach if batch loading still too slow

#### Phase 2: Short-term Optimizations (✅ Partially Completed)
- [x] 11.7.5. Server-side aggregation query (single query returning activities with attempt counts and most recent attempt using SQL aggregation)
- [x] 11.7.6. Implement caching layer (Server-side caching with `unstable_cache` for course modules, enrollments, user settings, TTL: 5-10 minutes)
- [x] 11.7.7. Code splitting for activity type components (lazy load with `React.lazy()`)
- [x] 11.7.8. Progressive loading (show activities list immediately, load attempt data in background with skeleton loaders)

#### Phase 3: Medium-term Optimizations (Planned)
- [ ] 11.7.9. Pagination/virtualization for large activity lists (load 20 at a time, use React Virtual)
- [ ] 11.7.10. Denormalization for attempt counts (store attempt count on `LearningActivity` model, updated via database trigger)
- [ ] 11.7.11. Background job for statistics (pre-compute attempt counts periodically, update cached statistics)
- [ ] 11.7.12. Memoization improvements (memoize filtered activity lists, expensive computations with `useMemo`)

#### Additional Optimization Ideas (Future Consideration)
- [ ] 11.7.13. API route optimization (create single endpoint `/api/activities/[courseId]/summary` returning activities + attempt counts + last attempt)
- [ ] 11.7.14. Streaming/SSE (stream activity data as it loads, use Server-Sent Events for real-time updates)
- [ ] 11.7.15. Database connection pooling optimization (ensure proper connection pool settings, use PgBouncer)
- [ ] 11.7.16. Optimistic updates (update UI immediately on submit, sync with server in background)
- [ ] 11.7.17. Reduce data transfer (don't fetch full attempt objects, only needed fields)
- [ ] 11.7.18. Defer attempt loading (load activities first, load attempts after activities render)

**Estimated Performance Impact**:
- **Before**: ~50+ queries, 2-5 seconds load time
- **After Phase 1**: ~2 queries, 200-500ms load time (✅ Implemented)
- **After Phase 2**: ~1 query, 100-300ms load time (✅ Implemented - React Query + caching)
- **After Phase 3**: <100ms load time (Target)

### Phase 12: Testing & Deployment
12.1. Test payment flows (Stripe test mode)
12.2. Test subscription lifecycle
12.3. Test content access controls
12.4. Test analytics accuracy
12.5. Test blog content generation workflow
12.6. Test error handling and logging (verify error boundaries, logging service, make.com notifications)
12.7. Set up production Stripe keys
12.8. Deploy to Netlify
12.9. Configure environment variables
12.10. Verify monitoring/error tracking in production

## Key Files Structure

```
/app
  /(auth) - Login/signup pages
  /(dashboard)
    /admin - Admin dashboard routes
    /student - Student dashboard (profile, courses, progress, analytics)
  /courses - Course catalog and detail pages
  /learn/[courseId] - Course learning interface (accessed from student dashboard)
  /cohorts/[cohortId] - Cohort learning interface (group coaching dashboard with sessions and message board)
  /blog - Blog listing and category pages
  /blog/[slug] - Blog article detail pages
  /api/webhooks/stripe - Stripe webhook endpoint (receives payment events from Stripe)
  /lib/webhooks/make.ts - Centralized webhook utility (sends events TO make.com)
  /actions - Server Actions
    /courses.ts
    /enrollments.ts
    /progress.ts
    /payments.ts
    /analytics.ts
    /messages.ts
    /appointments.ts
    /blog.ts
    /students.ts
    /financials.ts
    /coupons.ts
    /orders.ts
    /support-tickets.ts
    /cohorts.ts
    /cohort-enrollments.ts
    /group-coaching-sessions.ts
    /cohort-messages.ts
/components
  /ui - shadcn components
  /course - Course-specific components
    VideoPlayer.tsx
    QuizComponent.tsx
    FlashcardComponent.tsx
    NotesViewer.tsx
    MessagingComponent.tsx
    AppointmentBooking.tsx
    SupportTicketList.tsx
    SupportTicketForm.tsx
    TicketConversation.tsx
  /cohort - Cohort-specific components
    GroupCoachingSessions.tsx
    CoachingSessionCard.tsx
    CohortMessageBoard.tsx
    MessagePost.tsx
    MessagePostForm.tsx
  /payment - Payment components
    PaymentForm.tsx
    PaymentIntentHandler.tsx
    CouponInput.tsx
    DiscountDisplay.tsx
  /admin - Admin components
    BlogManagement.tsx
    ContentGenerationControls.tsx
    StudentManagement.tsx
    StudentDetails.tsx
    EnrollmentManagement.tsx
    CouponManagement.tsx
    CouponForm.tsx
    SupportTicketManagement.tsx
    SupportTicketDetails.tsx
    TicketReplyForm.tsx
    OrderManagement.tsx
    OrderDetails.tsx
    RefundDialog.tsx
    FinancialsDashboard.tsx
    RevenueDashboard.tsx
    PurchasesList.tsx
    RefundsManagement.tsx
    FinancialReports.tsx
    ErrorLogViewer.tsx
    CohortManagement.tsx
    CohortForm.tsx
    CohortModuleSelector.tsx
    GroupCoachingSessionForm.tsx
    CohortMessageBoardModeration.tsx
  /analytics - Analytics components
  /error - Error handling components
    ErrorBoundary.tsx
    ErrorFallback.tsx
    OfflineIndicator.tsx
  /blog - Blog components
    BlogCard.tsx
    ArticleContent.tsx
    RelatedArticles.tsx
/lib
  /prisma.ts - Prisma client singleton
  /supabase - Supabase client utilities
  /stripe - Stripe utilities
  /utils
    error-logging.ts - Centralized error logging service
    retry.ts - Automatic retry utility with exponential backoff
    cn.ts - cn() helper
/prisma
  schema.prisma - Database schema
/scripts
  /blog - Content generation scripts (following CONTENT_GENERATION_STRATEGY.md)
    upload_articles.py
    generate_outlines.py
    generate_articles.py
    quality_control_grammar.py
    add_internal_links.py
    add_related_articles.py
    add_external_links.py
    publish_articles.py
    article_prompts.md
/public - Static assets
```

## Technical Considerations

- Use Server Components by default, Client Components only when needed (interactivity)
- Server Actions for all mutations (enrollments, progress updates, payments)
- Prisma for database queries in Server Components/Actions
- Supabase Auth for authentication with cookie-based SSR
- All events (payments, appointments, messages, support tickets, errors, cohort enrollments, cohort messages) are sent TO make.com via centralized webhook utility (`lib/webhooks/make.ts`)
- make.com handles external integrations (email notifications, calendar sync, Slack alerts, bookkeeping) - app operations are handled directly in the app
- Messaging system sends student questions to make.com webhook for instructor notification
- Appointment bookings are sent to make.com webhook for calendar integration and notifications
- Webhook calls are non-blocking and include retry logic (3 attempts with exponential backoff)
- Payment Intents use Stripe Elements for client-side payment collection (no redirect to Stripe Checkout)
- Payment confirmation handled client-side with Stripe.js, then webhook processes enrollment
- **Cohorts**: Group coaching products that share course content via CohortModules junction table (no duplication)
- **Cohort Enrollment**: One-time purchase only, max students check, enrollment closing date validation
- **Group Coaching Sessions**: Manual Zoom/Teams link entry, Vimeo recording replaces link after session completion
- **Cohort Message Board**: Linear feed, file attachments (32MB), unread tracking, admin/instructor moderation
- Blog content generation follows CONTENT_GENERATION_STRATEGY.md workflow (6 phases: upload → outline → content → quality → enrichment → publish)
- Blog slug generation MUST use NFD normalization (unicodedata.normalize('NFD')) for proper accent handling
- Blog content generation uses gpt-5-nano for cost-effectiveness (~$0.003-0.005 per article)
- External links for blog use Perplexity AI (sonar model) for real web search capability
- Progress tracking should be debounced to avoid excessive writes
- Vimeo Player API requires domain whitelist in Vimeo settings
- Access expiration checks run on each content access
- Analytics can be computed on-demand or cached (consider caching strategy)

## Version 2 Features (Future Enhancements)

### Exam Week Recommendations
- **Light Review Tasks**: During exam week, schedule only light review sessions (no new content)
- **Crush the Exam**: Final preparation tasks focused on:
  - Quick flashcard review of key concepts
  - Last-minute practice questions
  - Exam format review
  - Stress management tips
  - Sleep and rest recommendations
- **Exam Day Preparation**: Day-before and day-of recommendations
- **Post-Exam**: Celebration and next steps guidance

### Authentication Enhancements
- **OAuth Providers**: Add support for additional authentication providers:
  - Google OAuth
  - GitHub OAuth
  - Microsoft/Azure AD OAuth
  - Apple Sign In
  - Other providers as needed
- **Social Login UI**: Update login page to include OAuth provider buttons
- **Account Linking**: Allow users to link multiple auth providers to their account
- **Instructor Role**: Already implemented in Phase 7.9.2

### Appointment Booking Enhancements
- **External Calendar Integration**: Sync appointments with Google Calendar, Outlook, etc.
- **Multiple Instructors**: Support for different instructors with individual availability schedules
- **Instructor-specific Rates**: Different hourly rates per instructor

### Virtual Tutor Functionality
- **AI-Powered Tutor**: Virtual tutor component for interactive learning assistance
- **Context-Aware Help**: Tutor understands course content and student progress
- **Personalized Guidance**: Adaptive learning paths based on student performance

### Monthly Live Seminars
- **Students can elect to participate in a monthly seminar where we will answer questions, cover topics and provide tips**
- **Maybe a paid feature**

### Extras Section
- **Recommended links, tools, books, ressources
- **Cross sell newsletter and other courses on the Dojo Financier Platform (professional, investors, founders)

## Calendar View with Weekly Plan and Exam date highlighted
- ** Visual calendar based study plan where their study assignement is clear for each week leading up to their exam date**

