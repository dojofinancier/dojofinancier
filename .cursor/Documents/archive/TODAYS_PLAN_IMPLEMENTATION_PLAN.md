# Plan du Jour (Today's Plan) Implementation Plan

## Overview

The "Plan du Jour" (Today's Plan) is the central UX element of the home/dashboard that presents 2-4 block-sized tasks for the current day. It serves as the primary entry point for students to engage with their study plan.

**NEW: Plan d'Étude (Weekly Study Plan)**
On the same page as the Plan du Jour, we will display the full week-by-week study plan until the exam. This provides students with a high-level overview of their entire study journey, showing:
- Week number
- Week date (e.g., "Semaine du 1er décembre 2025")
- Study tasks at module-level granularity:
  - "Lire [module title]"
  - "X séances de [count] flashcards" (count actual flashcard IDs)
  - "X activités d'apprentissage"
  - "Quiz [module title]"
  - "Examen blanc" (for mock exams)
  - "X questions de pratique" (for question bank drills)

---

## Study Plan Algorithm Requirements

### Core Constraints
- ✅ **All modules must be learned** (no optional modules)
- ✅ **All Phase 1 mini-quizzes must be scheduled**
- ✅ **All mock exams must be completed before exam date**
- ✅ **Phase 3 cannot start until Phase 1 is complete** (all modules learned)
- ✅ **Phase 1 and Phase 2 can proceed concurrently**
- ✅ **Phase 2 and Phase 3 can proceed concurrently**

### Block Calculations
- Videos = **2 blocks**
- Phase 1 mini-quiz = **1 block**
- Notes = **1 block**
- Minimum per module: **4 blocks** (for minimum study time calculation)

### Phase 1: Learn
- **Pace constraints** (algorithm-determined, not user-selected):
  - **Default**: **3 modules per week** (if enough time before exam)
  - **If exam soon**: Closer to **maximum (6 modules/week)**
  - **If exam far**: Closer to **minimum (1 module/week)**
  - Algorithm automatically adjusts based on time available
- Modules learned **sequentially** (by order: module.order)
- **Block calculation**: `(videos × 2) + (quizzes × 1) + (notes × 1)`
  - Most modules: 1 video, 1 notes, 1 quiz = 4 blocks
- When module is learned → **immediately unlock for Phase 2**

### Phase 2: Review (Concurrent with Phase 1)
- Review sessions scheduled using **spaced repetition** (1d, 4d, 10d, 21d after learning)
- **Review session content**: By default, all review sessions include **all learned modules**
  - Example: If modules 1-4 are learned, review sessions include items from modules 1-4
  - Smart review determines frequency (recent modules more often, but still includes earlier modules)
  - Study plan displays: "Réviser modules 1-4"
  - Student can use Smart Review or manually select flashcards/activities from desired modules
- **Prioritization**:
  - Coverage: Ensure **minimum per module** (e.g., 10 flashcards + 5 activities per module), regardless of content amount
  - Difficulty: Prioritize difficult flashcards (self-rating from review sessions) and activities from modules with failed quizzes (score < 70%)
- **Not all flashcards/activities need to be completed**

### Phase 3: Practice (After Phase 1 Complete)
- **Phase 1 completion required**: All modules must be marked as "learned"
  - If student tries Phase 3 without completing Phase 1, show clear message: "Vous devez marquer tous les modules comme terminés pour accéder à la Phase 3"
- **Mock exam scheduling**:
  - **Last mock**: **Week before exam** (e.g., exam week 10 → last mock in week 9)
  - **Second-to-last mock**: 2 weeks before exam
  - **First mock**: After Phase 1 completion
  - All mocks distributed between Phase 1 completion and exam week
- **Question bank practice**:
  - **More practice closer to exam** (increased frequency in final weeks)
  - Focus on weak areas (modules with failed quizzes, score < 70%)
  - **Not all question banks need to be completed**

### Minimum Study Time
- Formula: `(modules × 4) + (mockExams × 4)`
- Example: 12 modules + 2 mocks = **56 blocks minimum**
- **Warning shown** if student doesn't meet minimum:
  - ✅ At plan generation (if blocks available < minimum required)
  - ✅ When user updates study hours (if new hours don't meet minimum)
  - ✅ Continuously displayed if behind schedule

### Week 1 Calculation
- Week 1 starts on the **Monday of the week containing the start date**
- Week 1 extends to ensure it's a **full week** (if student starts Wed Nov 26, Week 1 = Mon Nov 24 to Sun Dec 7)

---

## 1. Current State Analysis

### 1.1 Existing Implementation

**What's Already Built:**
- ✅ `DailyPlanEntry` model in database
- ✅ `generateStudyPlanAction` - Generates study blocks for date range
- ✅ `TodaysPlan` component - Basic display of plan entries
- ✅ `getTodaysPlanAction` - Fetches today's plan entries
- ✅ `updatePlanEntryStatusAction` - Updates task status
- ✅ Block-based study plan algorithm
- ✅ Phase distribution logic (Learn/Review/Practice)

**What's Missing:**
- ❌ "Start today's plan" unified CTA button
- ❌ Task completion tracking with time spent
- ❌ Session summary after completion
- ❌ Integration with Smart Review for review tasks
- ❌ Integration with Phase 3 for practice tasks
- ❌ Dynamic task generation based on progress
- ❌ "Extra review session" suggestion
- ❌ Better task descriptions (specific module names, item counts)
- ❌ Progress visualization
- ❌ Task reordering/skipping

---

## 2. Requirements from COURSE_UX.md

### 2.1 Core Features

1. **Display 2-4 tasks** (each one block-sized = ~25-30 minutes)
2. **Primary CTA**: "Start today's plan" button
3. **Task completion**: Check off tasks as completed
4. **Summary screen**: Show time spent, topics touched
5. **Extra suggestion**: "If you have 25 more minutes, here's an extra review session"

### 2.2 Task Types

**Example tasks:**
- Learn – Module 4: Time Value of Money (video + mini-quiz)
- Review – 20 flashcards from Modules 1–3
- Practice – 10 mixed questions on interest rates & annuities

### 2.3 Behavior

- Tasks are generated from study plan algorithm
- Tasks adapt based on:
  - Exam date
  - Weekly study time
  - Self-rating (novice/intermediate/retaker)
  - Current progress
  - Preferred study days

---

## 3. Database Schema Updates

### 3.1 Current Schema Review

**DailyPlanEntry Model:**
```prisma
model DailyPlanEntry {
  id                     String          @id @default(uuid())
  userId                 String          @map("user_id")
  courseId               String          @map("course_id")
  date                   DateTime        @db.Date
  taskType               TaskType        @map("task_type")
  targetModuleId         String?         @map("target_module_id")
  targetContentItemId    String?         @map("target_content_item_id")
  targetQuizId           String?         @map("target_quiz_id")
  targetFlashcardIds     Json?           @map("target_flashcard_ids")
  targetActivityIds      Json?           @map("target_activity_ids") // NEW: For learning activities
  status                 PlanEntryStatus @default(PENDING)
  estimatedBlocks        Int             @default(1)
  actualTimeSpentSeconds Int?            @map("actual_time_spent_seconds")
  completedAt            DateTime?       @map("completed_at")
  order                  Int
  startedAt              DateTime?       @map("started_at") // NEW: Track when task started
  skippedAt              DateTime?       @map("skipped_at") // NEW: Track when task was skipped
  notes                  String?         @db.Text // NEW: Optional notes from student
  createdAt              DateTime        @default(now()) @map("created_at")
  updatedAt              DateTime        @updatedAt @map("updated_at")
}
```

**Required Changes:**
1. Add `targetActivityIds` (Json) for learning activities in review tasks
2. Add `startedAt` to track when task was started
3. Add `skippedAt` to track when task was skipped
4. Add `notes` field for optional student notes

---

## 4. Server Actions

### 4.1 Enhanced Actions

**File**: `app/actions/study-plan.ts` (UPDATE)

#### 4.1.1 Get Today's Plan (Enhanced)
```typescript
export async function getTodaysPlanAction(
  courseId: string,
  options?: {
    includeCompleted?: boolean;
    includeSkipped?: boolean;
  }
): Promise<{
  success: boolean;
  data?: {
    entries: DailyPlanEntry[];
    summary: {
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      pendingTasks: number;
      estimatedTimeMinutes: number;
      actualTimeMinutes: number;
      completionPercentage: number;
    };
    suggestions?: {
      extraReviewSession?: {
        available: boolean;
        itemCount: number;
        estimatedMinutes: number;
      };
    };
  };
  error?: string;
}>
```

**Enhancements:**
- Include related data (module, flashcards, activities)
- Calculate summary statistics
- Check for extra review session availability
- Filter by status if needed

#### 4.1.2 Start Today's Plan
```typescript
export async function startTodaysPlanAction(
  courseId: string
): Promise<{
  success: boolean;
  data?: {
    firstTaskId: string;
    firstTaskType: TaskType;
    navigationPath: string;
  };
  error?: string;
}>
```

**Logic:**
- Find first pending task
- Mark as IN_PROGRESS
- Return navigation path for that task
- If no tasks, generate them or show message

#### 4.1.3 Complete Task with Time Tracking
```typescript
export async function completeTaskAction(
  entryId: string,
  actualTimeSpentSeconds: number,
  notes?: string
): Promise<{ success: boolean; error?: string }>
```

**Logic:**
- Update status to COMPLETED
- Record `actualTimeSpentSeconds`
- Record `completedAt`
- Update `notes` if provided
- Check if all tasks completed → trigger summary

#### 4.1.4 Skip Task
```typescript
export async function skipTaskAction(
  entryId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }>
```

**Logic:**
- Update status to SKIPPED
- Record `skippedAt`
- Optionally reschedule for tomorrow
- Record skip reason in notes

#### 4.1.5 Get Plan Summary
```typescript
export async function getPlanSummaryAction(
  courseId: string,
  date: Date = new Date()
): Promise<{
  success: boolean;
  data?: {
    totalTimeSpent: number;
    topicsTouched: string[];
    tasksCompleted: number;
    tasksSkipped: number;
    averageTaskDuration: number;
    extraReviewAvailable: boolean;
  };
  error?: string;
}>
```

#### 4.1.6 Generate Extra Review Session
```typescript
export async function generateExtraReviewSessionAction(
  courseId: string
): Promise<{
  success: boolean;
  data?: {
    sessionId: string;
    itemCount: number;
    estimatedMinutes: number;
  };
  error?: string;
}>
```

**Logic:**
- Check for due review items (15-20 items)
- Create Smart Review session
- Return session details

#### 4.1.7 Regenerate Today's Plan
```typescript
export async function regenerateTodaysPlanAction(
  courseId: string
): Promise<{ success: boolean; error?: string }>
```

**Logic:**
- Delete today's pending/skipped tasks
- Regenerate based on current progress
- Adapt to what's been learned/completed

---

## 5. Task Generation Logic

### 5.1 Enhanced Task Generation

**File**: `lib/utils/study-plan.ts` (UPDATE)

#### 5.1.1 Generate Review Tasks
```typescript
export async function generateReviewTasks(
  courseId: string,
  userId: string,
  date: Date,
  blocksAvailable: number
): Promise<StudyBlock[]>
```

**Logic:**
- Query due review items from `ReviewQueueItem`
- Estimate blocks needed (1 block ≈ 15-20 items)
- Create `StudyBlock` entries with:
  - `taskType: 'REVIEW'`
  - `targetFlashcardIds` or `targetActivityIds`
  - Estimated blocks

#### 5.1.2 Generate Practice Tasks
```typescript
export async function generatePracticeTasks(
  courseId: string,
  userId: string,
  date: Date,
  blocksAvailable: number
): Promise<StudyBlock[]>
```

**Logic:**
- Check for available question banks
- Check for mock exams
- Create practice tasks based on phase and timeline
- Include specific question counts

#### 5.1.3 Generate Learn Tasks
```typescript
export async function generateLearnTasks(
  courseId: string,
  userId: string,
  date: Date,
  modules: Module[],
  blocksAvailable: number
): Promise<StudyBlock[]>
```

**Logic:**
- Find next unlearned module
- Create learn task with:
  - `targetModuleId`
  - Estimated blocks (based on module content)
  - Specific description

### 5.2 Task Prioritization

**Priority Order:**
1. **Overdue review items** (highest priority)
2. **Current phase tasks** (based on timeline)
3. **Next module to learn** (if in Learn phase)
4. **Practice tasks** (if in Practice phase)

### 5.3 Task Adaptation

**Adapt based on:**
- **Progress**: If module already learned, skip to next
- **Performance**: If struggling, add more review
- **Time constraints**: If behind, prioritize high-yield content
- **Exam proximity**: Shift to practice-heavy near exam

---

## 6. Client Components

### 6.1 Enhanced TodaysPlan Component

**File**: `components/course/todays-plan.tsx` (UPDATE)

**New Features:**
1. **"Start Today's Plan" Button**
   - Primary CTA at top
   - Starts first pending task
   - Shows progress indicator

2. **Task Cards**
   - Better descriptions:
     - "Learn – Module 4: Time Value of Money"
     - "Review – 20 flashcards from Modules 1–3"
     - "Practice – 10 mixed questions on interest rates"
   - Visual progress indicators
   - Time estimates
   - Status badges

3. **Task Actions**
   - Start task → Navigate to appropriate phase
   - Complete task → Show time entry (optional)
   - Skip task → Ask for reason, reschedule
   - View details → Show task specifics

4. **Progress Visualization**
   - Progress bar showing completion
   - Time spent vs. estimated
   - Completion percentage

5. **Summary Screen**
   - Show after all tasks completed
   - Display:
     - Total time spent
     - Topics touched (module names)
     - Tasks completed
     - Average task duration
   - "Extra review session" suggestion
   - Celebration animation/confetti

6. **Empty State**
   - If no tasks: "No tasks for today"
   - Option to generate tasks
   - Link to study plan settings

### 6.2 Task Detail Component

**File**: `components/course/task-detail.tsx` (NEW)

**Purpose**: Show detailed information about a task before starting

**Features:**
- Task description
- Estimated time
- What will be covered
- Prerequisites (if any)
- Start button

### 6.3 Task Completion Dialog

**File**: `components/course/task-completion-dialog.tsx` (NEW)

**Purpose**: Collect completion data when task is finished

**Fields:**
- Time spent (auto-tracked or manual entry)
- Optional notes
- Difficulty rating (optional)
- Completion button

### 6.4 Plan Summary Component

**File**: `components/course/plan-summary.tsx` (NEW)

**Purpose**: Display summary after completing all tasks

**Features:**
- Statistics cards
- Topics covered list
- Time breakdown
- Extra review session CTA
- Share progress (optional)
- Next day preview

---

## 7. Integration Points

### 7.1 Smart Review Integration

**When task type is REVIEW:**
- Navigate to Smart Review with pre-filtered items
- Use `targetFlashcardIds` and `targetActivityIds` from plan entry
- After review session, auto-complete task
- Record actual time spent from session

**Implementation:**
```typescript
// In TodaysPlan component
if (taskType === TaskType.REVIEW) {
  const flashcardIds = entry.targetFlashcardIds as string[] | null;
  const activityIds = entry.targetActivityIds as string[] | null;
  
  // Start Smart Review with filtered items
  router.push(`/apprendre/${courseId}?phase=review&flashcards=${flashcardIds?.join(',')}&activities=${activityIds?.join(',')}`);
}
```

### 7.2 Phase 3 (Practice) Integration

**When task type is PRACTICE:**
- Navigate to Practice phase
- Pre-select question bank or mock exam
- After practice session, auto-complete task
- Record score and time

### 7.3 Phase 1 (Learn) Integration

**When task type is LEARN:**
- Navigate to Learn phase
- Pre-select module from `targetModuleId`
- Track progress through module
- Auto-complete when module marked "learned"

---

## 8. UI/UX Enhancements

### 8.1 Visual Design

**Task Cards:**
- Color-coded by task type:
  - Learn: Blue
  - Review: Purple
  - Practice: Orange
- Icons for each type
- Progress indicators
- Time estimates prominently displayed

**Progress Bar:**
- Overall completion percentage
- Visual representation of completed vs. pending
- Time spent vs. estimated

**Summary Screen:**
- Celebration animation
- Statistics in cards
- Visual timeline of tasks
- Motivational messages

### 8.2 Interactions

**Smooth Transitions:**
- Animate task completion
- Fade in/out for status changes
- Progress bar animations

**Feedback:**
- Toast notifications for actions
- Confirmation dialogs for skipping
- Success messages for completion

**Accessibility:**
- Keyboard navigation
- Screen reader support
- Focus management

---

## 9. Time Tracking

### 9.1 Automatic Time Tracking

**For Review Tasks:**
- Use `ReviewSession.startedAt` and `completedAt`
- Calculate duration automatically

**For Practice Tasks:**
- Use quiz/exam start and completion times
- Track from session start to submission

**For Learn Tasks:**
- Track from module entry to "Mark as learned"
- Or use video watch time + quiz time

### 9.2 Manual Time Entry

**Fallback:**
- If automatic tracking fails
- Allow manual entry in completion dialog
- Validate reasonable time ranges

---

## 10. Extra Review Session Feature

### 10.1 Logic

**Check Availability:**
- Query due review items
- If 15-20 items available → suggest extra session
- Calculate estimated time (1 block = 15-20 items)

**Display:**
- Show after all tasks completed
- "If you have 25 more minutes, here's an extra review session"
- Button: "Start Extra Review"
- Show item count and estimated time

**Implementation:**
- Use `getDueReviewItemsAction` from Smart Review
- Create review session if user accepts
- Track separately from main plan

---

## 11. Adaptive Task Generation

### 11.1 Progress-Based Adaptation

**Check Before Generating:**
- What modules have been learned?
- What review items are due?
- What practice has been done?
- Current phase (based on exam date)

**Adapt Tasks:**
- Skip learned modules
- Prioritize overdue reviews
- Adjust practice frequency based on performance
- Compress timeline if behind schedule

### 11.2 Performance-Based Adaptation

**Track Performance:**
- Review difficulty ratings
- Quiz scores
- Practice performance

**Adjust Plan:**
- If struggling → more review, less new content
- If excelling → more practice, faster progression
- If behind → prioritize high-yield content

---

## 12. Implementation Phases

### Phase 1: Core Enhancements (Week 1)
1. ✅ Update database schema (add fields)
2. ✅ Enhance `getTodaysPlanAction` with summary
3. ✅ Add `startTodaysPlanAction`
4. ✅ Enhance `completeTaskAction` with time tracking
5. ✅ Update `TodaysPlan` component with "Start" button
6. ✅ Add task completion dialog

### Phase 2: Integration (Week 2)
1. ✅ Integrate with Smart Review
2. ✅ Integrate with Phase 3 Practice
3. ✅ Integrate with Phase 1 Learn
4. ✅ Auto-complete tasks after activities
5. ✅ Time tracking integration

### Phase 3: Summary & Extras (Week 3)
1. ✅ Plan summary component
2. ✅ Extra review session feature
3. ✅ Celebration animations
4. ✅ Statistics and analytics
5. ✅ Task regeneration logic
6. ✅ **Plan d'Étude (Weekly Study Plan)** - Week-by-week overview

### Phase 4: Polish (Week 4)
1. ✅ UI/UX refinements
2. ✅ Performance optimization
3. ✅ Error handling
4. ✅ Testing
5. ✅ Documentation

---

## 13. Data Flow

### 13.1 Daily Plan Generation Flow

```
User Course Settings
  ↓
Study Plan Algorithm
  ↓
Generate Study Blocks (for date range)
  ↓
Create DailyPlanEntry records
  ↓
Display in TodaysPlan component
```

### 13.2 Task Completion Flow

```
User clicks "Start Task"
  ↓
Update status to IN_PROGRESS
  ↓
Navigate to appropriate phase
  ↓
User completes activity
  ↓
Auto-detect completion (or manual)
  ↓
Update status to COMPLETED
  ↓
Record time spent
  ↓
Check if all tasks done → Show summary
```

### 13.3 Review Task Flow

```
Review task in plan
  ↓
User clicks "Start"
  ↓
Query ReviewQueueItem for due items
  ↓
Filter by targetFlashcardIds/targetActivityIds
  ↓
Start Smart Review session
  ↓
User completes review
  ↓
Auto-complete plan task
  ↓
Record time from session
```

---

## 14. Testing Strategy

### 14.1 Unit Tests

- Task generation logic
- Time calculation
- Status transitions
- Summary calculations

### 14.2 Integration Tests

- Task completion flow
- Smart Review integration
- Practice integration
- Learn integration

### 14.3 E2E Tests

- Complete "today's plan" flow
- Task skipping and rescheduling
- Extra review session
- Plan regeneration

---

## 15. Success Metrics

### 15.1 Engagement Metrics

- % of users who complete at least one task per day
- Average tasks completed per day
- Average time spent per day
- Task completion rate

### 15.2 Learning Outcomes

- Correlation between plan completion and exam performance
- Time spent vs. estimated time accuracy
- Review task effectiveness
- Practice task effectiveness

---

## 16. Future Enhancements

### 16.1 Advanced Features (Post-MVP)

- **Task Reordering**: Drag-and-drop to reorder tasks
- **Custom Tasks**: Allow users to add custom tasks
- **Task Templates**: Pre-defined task templates
- **Social Sharing**: Share daily progress
- **Streaks**: Track consecutive days of plan completion
- **Gamification**: Points, badges, achievements
- **Notifications**: Reminders for tasks
- **Calendar View**: See plan for multiple days
- **Analytics Dashboard**: Long-term progress tracking

---

## 17. Plan d'Étude (Weekly Study Plan) Feature

### 17.1 Overview

The "Plan d'Étude" displays the full week-by-week study plan from today until the exam week. It provides a high-level overview at module granularity, showing what needs to be accomplished each week.

### 17.2 Requirements

**Display Format:**
- Week number (Semaine 1, Semaine 2, etc.)
- Week date range (e.g., "Semaine du 1er décembre 2025")
- Module-level tasks:
  - "Lire [module title]" - For learn tasks
  - "X séances de 20 flashcards" - For review tasks
  - "Quiz chapitre [number]" - For quiz/practice tasks

**Example Week Display:**
```
Semaine 1 - Semaine du 1er décembre 2025
  • Lire Module 1: Introduction à la finance
  • Lire Module 2: Valeur temporelle de l'argent
  • 2 séances de 20 flashcards
  • Quiz chapitre 1
```

### 17.3 Data Structure

**New Interface:**
```typescript
interface WeeklyPlanWeek {
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  tasks: WeeklyPlanTask[];
  phase: 'LEARN' | 'REVIEW' | 'PRACTICE' | 'MIXED';
  estimatedBlocks: number;
  completedTasks: number;
  totalTasks: number;
}

interface WeeklyPlanTask {
  type: 'LEARN' | 'REVIEW' | 'PRACTICE' | 'QUIZ';
  description: string;
  moduleId?: string;
  moduleTitle?: string;
  moduleNumber?: number;
  itemCount?: number; // For flashcards/review sessions
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}
```

### 17.4 Server Actions

**File**: `app/actions/study-plan.ts` (NEW)

#### 17.4.1 Get Weekly Study Plan
```typescript
export async function getWeeklyStudyPlanAction(
  courseId: string
): Promise<{
  success: boolean;
  data?: {
    weeks: WeeklyPlanWeek[];
    examDate: Date;
    totalWeeks: number;
    currentWeek: number;
    progress: {
      weeksCompleted: number;
      weeksInProgress: number;
      weeksPending: number;
    };
  };
  error?: string;
}>
```

**Logic:**
- Get user course settings (exam date, study hours)
- Get all DailyPlanEntry records for the course
- Group entries by week (Monday to Sunday)
- Aggregate tasks at module level:
  - Learn tasks → "Lire [module title]"
  - Review tasks → Count flashcard sessions → "X séances de 20 flashcards"
  - Quiz tasks → "Quiz chapitre [number]"
- Calculate week statistics
- Determine current week

#### 17.4.2 Generate Weekly Plan Summary
```typescript
export async function generateWeeklyPlanSummaryAction(
  courseId: string
): Promise<{
  success: boolean;
  data?: WeeklyPlanWeek[];
  error?: string;
}>
```

**Logic:**
- Use existing `generateStudyPlanAction` to ensure plan exists
- Query DailyPlanEntry records grouped by week
- Aggregate and format for weekly display
- Calculate completion status per week

### 17.5 Client Components

#### 17.5.1 WeeklyStudyPlan Component

**File**: `components/course/weekly-study-plan.tsx` (NEW)

**Features:**
- Display weeks in an accordion (collapsible)
- Show week number and date range
- Display module-level tasks
- Visual indicators:
  - Current week highlighted
  - Completed weeks (green checkmark)
  - In-progress weeks (blue indicator)
  - Pending weeks (gray)
- Progress bar per week
- **Accordion behavior**: All weeks collapsed except current week (auto-expanded)
- Individual task completion checkmarks (automatic based on task status)
- No click actions on tasks (informational only)

**Props:**
```typescript
interface WeeklyStudyPlanProps {
  courseId: string;
  course: {
    modules: Array<{
      id: string;
      title: string;
      order: number;
    }>;
  };
  settings: {
    examDate: Date;
    studyHoursPerWeek: number;
  };
}
```

**UI Structure:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Plan d'Étude</CardTitle>
    <CardDescription>
      Vue d'ensemble de votre plan d'étude jusqu'à l'examen
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {weeks.map((week) => (
        <WeekCard
          key={week.weekNumber}
          week={week}
          isCurrentWeek={week.weekNumber === currentWeek}
        />
      ))}
    </div>
  </CardContent>
</Card>
```

#### 17.5.2 WeekCard Component

**File**: `components/course/weekly-study-plan-week-card.tsx` (NEW)

**Features:**
- Week header with number and date
- Task list with icons
- Progress indicator
- Status badge
- Expandable to show daily breakdown (optional)

**Task Formatting:**
- Learn: "Lire [module title]" with book icon (full module title)
- Review: 
  - "X séances de [count] flashcards" (count actual flashcard IDs)
  - "X activités d'apprentissage" (count learning activities)
  - Or combined: "X séances de révision intelligente" (for Smart Review)
- Quiz: "Quiz [module title]" with target icon (use module title, not chapter number)
- Practice: 
  - "Examen blanc" (for mock exams)
  - "X questions de pratique" (for question bank drills)

### 17.6 Task Aggregation Logic

**File**: `lib/utils/weekly-plan-aggregator.ts` (NEW)

#### 17.6.1 Aggregate Daily Entries to Weekly Tasks
```typescript
export function aggregateWeeklyTasks(
  dailyEntries: DailyPlanEntry[],
  modules: Array<{ id: string; title: string; order: number }>
): WeeklyPlanWeek[]
```

**Logic:**
1. Group entries by week (Monday to Sunday)
   - Week 1 starts on the Monday of the first full week (if student starts Wed Nov 26, Week 1 = Mon Nov 24 to Sun Dec 7)
2. For each week:
   - **Learn tasks**: Group by module → "Lire [module title]" (show each module on separate line, aggregate if same module appears multiple times)
   - **Review tasks**: 
     - Count actual flashcard IDs from `targetFlashcardIds` → "X séances de [count] flashcards"
     - Count learning activities → "X activités d'apprentissage"
     - Or show Smart Review option
   - **Quiz tasks**: Group by module → "Quiz [module title]" (use full module title)
   - **Practice tasks**: 
     - Mock exams → "Examen blanc"
     - Question bank drills → "X questions de pratique"
3. Calculate statistics per week
4. Determine phase (Learn-heavy, Review-heavy, Practice-heavy, Mixed)
5. Show individual task completion status (automatic when tasks are completed)

#### 17.6.2 Format Week Date Range
```typescript
export function formatWeekDateRange(startDate: Date): string
```

**Output**: "Semaine du 1er décembre 2025" (French format)

**Logic:**
- Get Monday of the week (weeks always start Monday)
- Format as "Semaine du [day] [month] [year]"
- Handle "1er" for 1st of month
- Week numbering starts from 1 (Semaine 1, Semaine 2, etc.)

### 17.7 Integration with Plan du Jour Page

**File**: `components/course/study-plan-dashboard.tsx` (NEW)

**Purpose**: Container component that displays both Plan du Jour and Plan d'Étude

**Layout:**
```tsx
<div className="space-y-6">
  {/* Plan du Jour - Today's tasks */}
  <TodaysPlan courseId={courseId} />
  
  {/* Plan d'Étude - Weekly overview */}
  <WeeklyStudyPlan 
    courseId={courseId}
    course={course}
    settings={settings}
  />
</div>
```

**Note**: Plan d'Étude is below Plan du Jour, no auto-scroll needed (accordion handles visibility)

**Update PhaseBasedLearningInterface:**
- Replace standalone `TodaysPlan` with `StudyPlanDashboard`
- This component contains both features

### 17.8 Database Queries

**Efficient Querying:**
```typescript
// Get all plan entries for the course, grouped by week
const entries = await prisma.dailyPlanEntry.findMany({
  where: {
    userId: user.id,
    courseId: courseId,
    date: {
      gte: new Date(), // From today
      lte: examDate,   // Until exam
    },
  },
  include: {
    module: {
      select: {
        id: true,
        title: true,
        order: true,
      },
    },
  },
  orderBy: {
    date: 'asc',
  },
});
```

**Note**: All weeks should have tasks (no empty weeks). Exam week should have "light review" and "crush the exam" tasks.

### 17.9 UI/UX Design

**Visual Hierarchy:**
- **Plan du Jour**: Prominent at top (primary focus)
- **Plan d'Étude**: Below, collapsible or scrollable
- Clear separation with cards

**Week Card Design:**
- Header: Week number + date range + status badge
- Body: Task list with icons
- Footer: Progress bar (optional)
- Hover: Highlight effect
- Current week: Border highlight or background color

**Responsive Design:**
- Mobile: Stack vertically, compact week cards
- Desktop: Side-by-side or stacked, expanded view

**Interactions:**
- Click week card → Expand to show daily breakdown (optional)
- Click task → Navigate to relevant phase/module
- Scroll to current week on load

### 17.10 Task Description Generation

**Learn Tasks:**
```typescript
function formatLearnTask(entry: DailyPlanEntry, module: Module): string {
  return `Lire ${module.title}`;
}
```

**Review Tasks:**
```typescript
function formatReviewTask(
  reviewEntries: DailyPlanEntry[]
): string {
  // Count flashcard sessions (assuming ~20 flashcards per session)
  const sessionCount = reviewEntries.length;
  return `${sessionCount} séance${sessionCount > 1 ? 's' : ''} de 20 flashcards`;
}
```

**Quiz Tasks:**
```typescript
function formatQuizTask(entry: DailyPlanEntry, module: Module): string {
  return `Quiz ${module.title}`; // Use full module title
}
```

**Practice Tasks:**
```typescript
function formatPracticeTask(entry: DailyPlanEntry): string {
  if (entry.targetQuizId && entry.isMockExam) {
    return "Examen blanc";
  } else if (entry.targetQuestionBankId) {
    const questionCount = entry.targetQuestionCount || 20;
    return `${questionCount} questions de pratique`;
  }
  return "Pratique";
}
```

### 17.11 Progress Tracking

**Week Completion Status:**
- **Completed**: All tasks in week are COMPLETED
- **In Progress**: At least one task IN_PROGRESS or COMPLETED
- **Pending**: All tasks PENDING

**Task Completion (Individual):**
- Automatic completion detection:
  - Learn tasks: Marked complete when module is marked "learned"
  - Review tasks: Marked complete when review session is completed
  - Practice tasks: Marked complete when quiz/exam is submitted
- Show checkmark next to completed tasks within each week

**Visual Indicators:**
- ✅ Green checkmark for completed weeks
- 🔵 Blue dot for in-progress weeks
- ⚪ Gray circle for pending weeks
- ✅ Individual task checkmarks within week cards

### 17.12 Implementation Steps

1. **Create Weekly Plan Aggregator** (`lib/utils/weekly-plan-aggregator.ts`)
   - Group daily entries by week
   - Aggregate tasks at module level
   - Format task descriptions

2. **Create Server Actions** (`app/actions/study-plan.ts`)
   - `getWeeklyStudyPlanAction`
   - `generateWeeklyPlanSummaryAction`

3. **Create Components**
   - `WeeklyStudyPlan` - Main component
   - `WeeklyStudyPlanWeekCard` - Individual week card
   - `StudyPlanDashboard` - Container for both features

4. **Update PhaseBasedLearningInterface**
   - Replace `TodaysPlan` with `StudyPlanDashboard`

5. **Add Date Formatting Utility**
   - French date formatting
   - Week date range calculation

6. **Testing**
   - Test with various exam dates
   - Test with different study hours
   - Test task aggregation logic

---

## Summary

The Plan du Jour feature is the central UX element that guides students through their daily study activities. It:

1. **Presents 2-4 focused tasks** based on the study plan algorithm
2. **Provides clear navigation** to appropriate learning phases
3. **Tracks progress and time** spent on each task
4. **Celebrates completion** with summary and suggestions
5. **Adapts dynamically** based on progress and performance
6. **Integrates seamlessly** with Smart Review, Practice, and Learn phases

**The Plan d'Étude (Weekly Study Plan)** complements the daily plan by providing:

1. **Full week-by-week overview** from today until the exam
2. **Module-level granularity** showing what needs to be accomplished each week
3. **Clear task descriptions** (e.g., "Lire Module 1", "4 séances de 20 flashcards", "Quiz chapitre 3")
4. **Progress tracking** at the weekly level
5. **Visual timeline** showing the entire study journey

**Integration:**
- Both features displayed on the same page (home phase)
- Plan du Jour at the top (primary focus)
- Plan d'Étude below (contextual overview)
- Shared data source (DailyPlanEntry records)
- Consistent design language

The implementation builds on existing infrastructure while adding the polish and user experience needed to make it the primary entry point for student engagement.

