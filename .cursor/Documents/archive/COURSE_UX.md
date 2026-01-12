# LMS Study Experience Design Spec  
**Focus:** Exam prep with study-phase-based UX

---

## 1. Core Principles

1. The UI should **nudge students into effective study habits**, not just host content.
2. The **home experience is structured by “study phases”**, not just modules or tools.
3. Modules, tools, and analytics are **secondary navigation** that support the main journey.

---

## 2. Study Phases (Top-Level Experience)

These phases are the backbone of the UX:

1. **Phase 0 – Orientation**
   - Explain exam format, difficulty, pass mark.
   - Short “How to study for this exam” video (5–10 min).
   - Explain the three phases: Learn → Review → Practice.
   - Collect initial data in a short form (exam date, study time, self-rating).

2. **Phase 1 – Learn the Material**
   - Objective: First meaningful pass through the syllabus.
   - Content Requirements:
     - **Videos** (Vimeo links) - Core lesson content
     - **Notes** - Lesson notes/summaries
     - **10-12 MCQs** - Short quiz after each topic
   - Activities:
     - Watch videos / read lesson notes.
     - Take notes.
     - Do **short quiz** after each topic (10-12 questions).
   - Output:
     - Topic marked as **"Learned"** (unlocks it for spaced review).
     - Initial difficulty estimation per topic (based on quiz results).

3. **Phase 2 – Review & Active Recall**
   - Objective: Consolidate knowledge via active recall & spaced repetition.
   - Content Requirements:
     - **Flashcards** - For spaced repetition
     - **Learning Activities** - 8 types of interactive activities (see below)
   - Activities:
     - Flashcards.
     - Learning activities (8 types):
       1. Short-answer (typed response)
       2. Fill-in-the-blank / cloze
       3. Sorting / ranking / ordering
       4. Classification / drag-and-drop into buckets
       5. Numeric entry (calculation drills)
       6. Table completion / "fill the grid"
       7. Error-spotting ("Find the mistake")
       8. Deep dives (instructor-reviewed, not auto-graded)
   - Output:
     - Memory strength estimation per topic.
     - Spaced repetition schedule queues.
     - Activity completion tracking.

4. **Phase 3 – Practice & Exam Simulation**
   - Objective: Test readiness and calibrate.
   - Content Requirements:
     - **Mock Exams** - Timed full-length exams
     - **MCQ Question Banks** - Large pools of questions tagged by chapter, served randomly
   - Activities:
     - Short topic drills.
     - Mixed question sets (from question banks).
     - Timed mock exams.
   - Output:
     - Score breakdown by topic/skill.
     - Automatic feeding of mistakes into Phase 2 review queue.

---

## 3. Navigation & Page Types

### 3.1 Top-Level Navigation

- **Home**  
  - Study phases overview.
  - “Today’s Plan” (tasks generated from algorithm).
  - Progress snapshots.

- **Syllabus**  
  - Classic module/chapter list (for orientation & reassurance).
  - Each module shows:
    - % “learned”
    - Review status
    - Practice performance indicator.

- **Tools** (optional power-user hub)
  - All videos.
  - Question bank.
  - Flashcard browser.
  - Notes overview.

- **Progress / Analytics**
  - Scores, trends, topic weaknesses.
  - Completed modules & mock exams.
  - Time spent per phase (Learn vs Review vs Practice).

### 3.2 Phase Views

Each phase has its own main view:

- **Phase 1 – Learn**
  - Lists modules with progress bars.
  - Clicking module shows:
    1. Lesson content (video + transcript/summary).
    2. Notes panel (autosaved).
    3. Short quiz (10-12 Q).
    4. Button: **"Mark topic as learned"**.
  - Content Management:
    - Admin uploads videos (Vimeo links) per module
    - Admin creates/edits notes per module
    - Admin creates quizzes with 10-12 MCQs per module

- **Phase 2 – Review**
  - Main CTA: **"Start Smart Review"**.
    - Mixed deck of cards/activities from topics due for review.
  - Filters:
    - By module.
    - By tag (weak, recent errors, etc.).
    - By activity type.
  - Activity Types:
    1. **Short-answer**: Type word/number/short phrase (2-3 acceptable answers stored)
    2. **Fill-in-the-blank**: Sentence/formula with blanks
    3. **Sorting/Ranking**: Drag-and-drop ordering
    4. **Classification**: Sort items into 2-4 categories
    5. **Numeric entry**: Calculation with tolerance (±0.01 or ±1%)
    6. **Table completion**: Fill missing cells in a grid
    7. **Error-spotting**: Identify mistakes in worked solutions
    8. **Deep dives**: Research questions (sent to instructor for review)
  - After each card/activity:
    - Self-rating: Easy / Medium / Hard.
    - Used to update spaced repetition timing.
  - Content Management:
    - Admin creates flashcards (tagged by chapter)
    - Admin creates learning activities (tagged by chapter) in separate tab
    - Activities are organized by type with appropriate form fields

- **Phase 3 – Practice**
  - Options:
    - Quick practice (10–20 questions from question banks).
    - Topic-specific drills (from question banks, filtered by chapter).
    - Full mock exam (timed).
  - After any test:
    - Show score, breakdown by module/skill.
    - Button: **"Add my mistakes to review"** → pushes items into Phase 2 queue.
  - Content Management:
    - Admin creates mock exams (timed, with questions)
    - Admin creates question banks (large pools, tagged by chapter)
    - Questions from banks are served randomly to students

---

## 4. Initial Form: Data & Usage

On first login or first course launch, user completes a short form:

- **Exam date** (required).
- **Weekly study time** (required, in hours).
- **Preferred study days** (optional).
- **Self-rating:** novice / intermediate / retaker (required).

This data drives the **study plan engine**.

---

## 5. Exam Date Logic

### 5.1 Stored Fields

- `exam_date`
- `plan_created_at`

### 5.2 Core Uses

1. **Countdown & Status**
   - Display on dashboard:
     - `X days until your exam.`
     - Status label: On track / Slightly behind / At risk (based on plan vs. actual progress).

2. **Phase Allocation Over Time**
   - Divide timeline backwards from exam date into:
     - Final 2 weeks: mainly **Phase 3** (Practice & Mocks).
     - Middle period: **Phase 2** (Review & Active Recall).
     - Early period: **Phase 1** (Learn).

   Example heuristic (can be tuned):
   - If total weeks ≥ 8:
     - Weeks 1–4: Learn-heavy.
     - Weeks 5–6: Review-heavy.
     - Weeks 7–8: Practice-heavy.
   - If total weeks short (e.g., 4), compress:
     - Week 1: Learn-heavy.
     - Week 2: Learn + Review.
     - Week 3: Review + short practice tests.
     - Week 4: Practice-heavy + targeted review.

3. **Spacing Compression**
   - Determine spacing intervals based on remaining days:
     - Long timeline → longer spacing: 1d → 4d → 10d, etc.
     - Short timeline → compressed spacing: 1d → 2d → 4d.

4. **Risk Flags**
   - If, given current pace, user can’t complete:
     - Full content once + minimum review + at least one mock:
       - Show nudge:
         - “At this pace you’ll cover ~60% of content before the exam.”
         - Offer choices:
           - Increase weekly study hours.
           - Accept “minimum viable” path focusing on high-yield content.

---

## 6. Weekly Study Time Logic

### 6.1 Stored Fields

- `study_hours_per_week`
- `preferred_study_days` (array of weekdays, optional)

### 6.2 Blocks Concept

Define a **“block”** as ~25–30 minutes of focused work.

- 1 hour ≈ 2 blocks.
- Example mappings:
  - 1 video lesson → 1 block.
  - 1 review session (15–20 cards) → 1 block.
  - 1 short drill (10–20 Q) → 1–2 blocks.
  - 1 full mock exam + quick review → 4+ blocks.

Given `study_hours_per_week`, compute:
- `blocks_per_week = study_hours_per_week * 2` (approx).

### 6.3 Task Allocation

Use `blocks_per_week` to distribute tasks across phases:

- Early period: more **Learn** blocks.
- Middle period: more **Review** blocks.
- Late period: more **Practice** blocks.

Example per study day (for a novice with 6h/week = 12 blocks):
- 3 blocks per study day × 4 days/week:
  - Block 1: Learn (new topic).
  - Block 2: Review (flashcards/quiz).
  - Block 3: Short practice drill or additional review.

### 6.4 Feasibility Check

1. Estimate total blocks required:
   - `blocks_for_learn_all_modules`
   - `blocks_for_minimum_review`
   - `blocks_for_minimum_practice` (e.g. 2 mock exams).

2. Estimate total blocks available:
   - `blocks_available = weeks_until_exam * blocks_per_week`.

3. If `blocks_available < blocks_required`:
   - Show warning and ask user to:
     - Increase study time, or
     - Accept an optimized “high-yield only” path.

4. If user picks “high-yield only”:
   - Mark some modules/topics as **Essential**.
   - Deprioritize or hide **Optional** ones in their plan (still accessible via Syllabus).

---

## 7. Self-Rating Logic

### 7.1 Stored Field

- `self_rating` ∈ {novice, intermediate, retaker}

### 7.2 Block Ratios per Profile

Use self-rating to adjust the **proportion of blocks** per phase:

Example default ratios:

| Profile      | Learn (Phase 1) | Review (Phase 2) | Practice (Phase 3) |
|--------------|-----------------|------------------|---------------------|
| Novice       | 50–60%          | 30–40%           | 10–20%              |
| Intermediate | 35–45%          | 35–45%           | 20–30%              |
| Retaker      | 20–30%          | 30–40%           | 30–50%              |

These ratios drive what “Today’s Plan” prioritizes.

### 7.3 Phase Behaviour per Profile

- **Novice**
  - Heavy emphasis on Phase 1 at start.
  - More guided explanation and examples.
  - Orientation video is mandatory.
  - Mock exam introduced later in the plan.

- **Intermediate**
  - Faster pass through Phase 1.
  - Earlier start in Phase 2 (review).
  - Regular mini-tests introduced sooner.

- **Retaker**
  - Immediate **diagnostic test** on Day 1.
  - Plan strongly focused on Phase 2 & 3.
  - “Learn” phase used only to patch weak topics identified by diagnostics.

### 7.4 Adaptive Profile Update

- Track performance:
  - Quiz scores.
  - Review self-ratings.
  - Mock exam results.
- If behaviour contradicts self-rating:
  - Suggest adjusting plan.

Examples:
- Novice consistently scoring 85%+:
  - Suggest more practice-heavy plan.
- Intermediate repeatedly failing basic quizzes:
  - Suggest shifting to more Learn + Review blocks.

---

## 8. Today’s Plan – Core UX Element

The central element of the home/dashboard:

**“Today’s plan”** shows 2–4 tasks, each one block-sized:

Example (novice, 8 weeks left, 6h/week):

1. Learn – Module 4: Time Value of Money (video + mini-quiz)
2. Review – 20 flashcards from Modules 1–3
3. Practice – 10 mixed questions on interest rates & annuities

Behaviour:

- One primary CTA button: **“Start today’s plan”**.
- As tasks are completed, they are checked off.
- At end, show:
  - Small summary (time spent, topics touched).
  - Immediate suggestion:
    - “If you have 25 more minutes, here’s an extra review session.”

---

## 9. Data Model (High-Level Sketch)

You can refine for your specific stack, but conceptually:

**UserCourseSettings**
- `user_id`
- `course_id`
- `exam_date`
- `study_hours_per_week`
- `preferred_study_days` (JSON array)
- `self_rating` (enum)
- `plan_created_at`

**TopicProgress**
- `user_id`
- `course_id`
- `topic_id`
- `learn_status` (not_started / in_progress / learned)
- `last_learned_at`
- `last_reviewed_at`
- `memory_strength` (0–1 or discrete levels)
- `error_rate` (from questions)

**ReviewQueueItem**
- `user_id`
- `topic_id` or `card_id`
- `due_at`
- `difficulty_last_time` (easy / medium / hard)

**AssessmentResult**
- `user_id`
- `course_id`
- `assessment_id` (quiz/drill/mock)
- `score`
- `completed_at`
- `breakdown_by_topic` (JSON)
- `time_spent_seconds`

**DailyPlanEntry**
- `user_id`
- `course_id`
- `date`
- `task_type` (learn / review / practice)
- `target_topic_id` or `assessment_id`
- `status` (pending / completed / skipped)
- `actual_time_spent_seconds`

---

## 10. Summary

- **Primary UX axis:** Study phases (Orientation → Learn → Review → Practice).
- **Secondary structure:** Modules/syllabus and tools.
- **Initial form data (exam date, study time, self-rating):**
  - Drives a **block-based study plan**.
  - Allocates blocks across phases over time.
  - Adapts spacing, difficulty, and emphasis based on user profile and remaining time.
  - Feeds “Today’s Plan” with a small set of high-impact tasks each day.

This design makes the LMS itself a **study coach**, not just a content library.
