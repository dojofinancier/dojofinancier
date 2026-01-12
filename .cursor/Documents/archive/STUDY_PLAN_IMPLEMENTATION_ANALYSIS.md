# Study Plan Implementation Analysis

## Executive Summary

**Current Status:**
- ❌ **Plan du Jour (Today's Plan)**: Not generating properly - likely because `generateSimpleStudyPlan` creates blocks but may not be creating entries for today
- ⚠️ **Plan d'Étude (Weekly Plan)**: Partially working but incomplete - shows raw daily entries instead of aggregated weekly tasks
- ⚠️ **Algorithm**: Using simplified version instead of enhanced content-aware algorithm

**Root Cause:**
The `generateStudyPlanAction` uses `generateSimpleStudyPlan` instead of `generateEnhancedStudyPlan`. The simple version:
- Creates only 1 block per module (not actual content items)
- Doesn't schedule actual videos, notes, quizzes
- Doesn't implement proper Phase 2 spaced repetition
- Doesn't implement proper Phase 3 mock exam scheduling
- Doesn't use content inventory

---

## 1. Documentation Requirements vs Implementation

### 1.1 Plan du Jour (Today's Plan) Requirements

**From Documentation:**
- Display 2-4 tasks per day (each ~25-30 minutes)
- Primary CTA: "Start today's plan" button
- Task completion with time tracking
- Summary screen after completion
- Extra review session suggestion
- Specific task descriptions (module names, item counts)

**Current Implementation:**
- ✅ Basic component exists (`components/course/todays-plan.tsx`)
- ✅ `getTodaysPlanAction` exists and queries `DailyPlanEntry` for today
- ❌ **ISSUE**: `generateSimpleStudyPlan` may not be creating entries for today
- ❌ Missing: "Start today's plan" unified CTA
- ❌ Missing: Time tracking integration
- ❌ Missing: Summary screen
- ❌ Missing: Extra review session feature
- ⚠️ Task descriptions are generic (not specific module/content)

### 1.2 Plan d'Étude (Weekly Study Plan) Requirements

**From Documentation:**
- Week-by-week overview from today until exam
- Module-level granularity:
  - "Lire [module title]" for learn tasks
  - "X séances de [count] flashcards" for review
  - "X activités d'apprentissage" for activities
  - "Quiz [module title]" for quizzes
  - "Examen blanc" for mock exams
  - "X questions de pratique" for question banks
- Accordion with current week auto-expanded
- Individual task completion checkmarks

**Current Implementation:**
- ✅ Component exists (`components/course/study-plan.tsx`)
- ✅ `getWeeklyStudyPlanAction` groups entries by week
- ⚠️ **ISSUE**: Shows raw daily entries instead of aggregated weekly tasks
- ⚠️ Task descriptions are generic (not formatted as per requirements)
- ⚠️ No aggregation logic (e.g., "4 séances de 20 flashcards")
- ⚠️ No module-level grouping (shows individual content items)

### 1.3 Study Plan Algorithm Requirements

**From Documentation:**
- Content-aware: Use actual content inventory
- Phase 1: Sequential learning with actual content items (videos, notes, quizzes)
- Phase 2: Spaced repetition (1d, 4d, 10d, 21d) with all learned modules
- Phase 3: Mock exams scheduled properly (last 1 week before, second-to-last 2 weeks before, first after Phase 1)
- Block calculations: Videos = 2 blocks, Quiz = 1 block, Notes = 1 block
- Phase 1 pace: Algorithm-determined (3/week default, adjusts based on time)

**Current Implementation:**
- ❌ **USING SIMPLE ALGORITHM**: `generateSimpleStudyPlan` instead of `generateEnhancedStudyPlan`
- ❌ Simple algorithm creates 1 block per module (4 blocks estimated, not actual content)
- ❌ No actual content items scheduled (videos, notes, quizzes)
- ❌ Phase 2 is basic (one review per week after learning, no spaced repetition)
- ❌ Phase 3 is basic (mock exams in final weeks, not properly scheduled)
- ✅ Enhanced algorithm exists but is NOT being used
- ✅ Content inventory exists and works
- ✅ Phase 1 pace calculation exists

---

## 2. Detailed Code Analysis

### 2.1 Plan Generation Flow

**Current Flow:**
```
User completes orientation form
  ↓
initializeCourseSettingsAction
  ↓
generateStudyPlanAction
  ↓
generateSimpleStudyPlan (❌ WRONG - should be generateEnhancedStudyPlan)
  ↓
Creates DailyPlanEntry records
  ↓
getTodaysPlanAction queries for today
  ↓
TodaysPlan component displays (may be empty if no entries for today)
```

**Expected Flow:**
```
User completes orientation form
  ↓
initializeCourseSettingsAction
  ↓
generateStudyPlanAction
  ↓
generateEnhancedStudyPlan (✅ CORRECT)
  ↓
  - getCourseContentInventory
  - generatePhase1Blocks (actual content items)
  - generatePhase2Blocks (spaced repetition)
  - generatePhase3Blocks (proper mock exam scheduling)
  ↓
Creates DailyPlanEntry records with actual content
  ↓
getTodaysPlanAction queries for today
  ↓
TodaysPlan component displays with specific tasks
```

### 2.2 Simple vs Enhanced Algorithm Comparison

#### Simple Algorithm (`generateSimpleStudyPlan`)
```typescript
// Creates 1 block per module
blocks.push({
  date: moduleDate,
  taskType: TaskType.LEARN,
  targetModuleId: module.id,
  estimatedBlocks: 4, // ❌ Fixed, not based on actual content
  order: blockOrder++,
});

// Phase 2: Basic review (one per week after learning)
blocks.push({
  date: reviewDate,
  taskType: TaskType.REVIEW,
  estimatedBlocks: 2, // ❌ Generic, no flashcards/activities
  order: blockOrder++,
});

// Phase 3: Basic practice (mock exams in final weeks)
blocks.push({
  date: practiceDate,
  taskType: TaskType.PRACTICE,
  estimatedBlocks: 4, // ❌ Generic, no specific quiz
  order: blockOrder++,
});
```

**Problems:**
1. ❌ No actual content items (videos, notes, quizzes) scheduled
2. ❌ No `targetContentItemId` or `targetQuizId` set
3. ❌ No `targetFlashcardIds` for review tasks
4. ❌ Phase 2 doesn't use spaced repetition
5. ❌ Phase 3 doesn't schedule specific mock exams
6. ❌ Doesn't use content inventory

#### Enhanced Algorithm (`generateEnhancedStudyPlan`)
```typescript
// Phase 1: Actual content items
for (const contentItem of moduleContent.contentItems) {
  if (contentItem.contentType === "VIDEO") {
    blocks.push({
      date: scheduleDate,
      taskType: TaskType.LEARN,
      targetModuleId: module.id,
      targetContentItemId: contentItem.id, // ✅ Specific content
      estimatedBlocks: 2, // ✅ Correct: Videos = 2 blocks
      order: 0,
    });
  } else if (contentItem.contentType === "NOTE") {
    blocks.push({
      date: scheduleDate,
      taskType: TaskType.LEARN,
      targetModuleId: module.id,
      targetContentItemId: contentItem.id, // ✅ Specific content
      estimatedBlocks: 1, // ✅ Correct: Notes = 1 block
      order: 0,
    });
  }
}

// Phase 2: Spaced repetition with actual flashcards/activities
for (const interval of spacingIntervals) {
  const reviewDate = new Date(learnedDate);
  reviewDate.setDate(reviewDate.getDate() + interval);
  
  blocks.push({
    date: reviewDate,
    taskType: TaskType.REVIEW,
    targetModuleId: module.id,
    targetFlashcardIds: prioritizedFlashcardIds, // ✅ Actual flashcards
    estimatedBlocks: 1,
    order: 0,
  });
}

// Phase 3: Proper mock exam scheduling
// Last mock: 1 week before exam
// Second-to-last: 2 weeks before exam
// First: After Phase 1 completion
```

**Advantages:**
1. ✅ Uses content inventory
2. ✅ Schedules actual content items
3. ✅ Proper block calculations
4. ✅ Phase 2 uses spaced repetition
5. ✅ Phase 3 properly schedules mock exams
6. ✅ Includes flashcards and activities in review

### 2.3 Why Plan du Jour Might Not Be Generating

**Possible Issues:**

1. **Date Mismatch:**
   - `generateSimpleStudyPlan` schedules modules across weeks
   - If today is not a "preferred study day" or not in the scheduled week, no entries for today
   - Week 1 calculation might not align with today's date

2. **No Entries for Today:**
   - Simple algorithm distributes modules across weeks
   - If exam is far away, modules might be scheduled in future weeks
   - Today might not have any scheduled tasks

3. **Date Comparison Issue:**
   ```typescript
   // In getTodaysPlanAction
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   
   // Query for exact date match
   date: today, // ❌ Might not match if timezone issues
   ```

4. **Week 1 Start Date:**
   - Week 1 starts on Monday of week containing `planCreatedAt`
   - If plan was created today (Wednesday), Week 1 starts on Monday (2 days ago)
   - But blocks might be scheduled starting from that Monday, not today

### 2.4 Why Plan d'Étude Is Incomplete

**Current Implementation:**
- `getWeeklyStudyPlanAction` groups `DailyPlanEntry` records by week
- Shows individual entries (one per content item)
- No aggregation logic

**What's Missing:**
1. **Task Aggregation:**
   - Should group LEARN tasks by module → "Lire [module title]"
   - Should count REVIEW sessions → "X séances de 20 flashcards"
   - Should group QUIZ tasks → "Quiz [module title]"
   - Should identify mock exams → "Examen blanc"

2. **Task Formatting:**
   - Current: "Apprendre - [module title]" (generic)
   - Required: "Lire [module title]" (specific format)

3. **Content Counting:**
   - Should count actual flashcard IDs from `targetFlashcardIds`
   - Should count learning activities
   - Should show session counts

---

## 3. Differences Summary

### 3.1 Algorithm Used

| Aspect | Documentation | Current Implementation | Status |
|--------|--------------|----------------------|--------|
| Algorithm | `generateEnhancedStudyPlan` | `generateSimpleStudyPlan` | ❌ Wrong |
| Content Inventory | Required | Exists but not used | ❌ Not used |
| Phase 1 Content | Actual videos/notes/quizzes | Generic module blocks | ❌ Missing |
| Phase 2 | Spaced repetition (1d, 4d, 10d, 21d) | Basic weekly reviews | ❌ Missing |
| Phase 3 | Proper mock exam scheduling | Basic final weeks | ❌ Missing |

### 3.2 Plan du Jour

| Feature | Documentation | Current Implementation | Status |
|---------|--------------|----------------------|--------|
| Task Generation | 2-4 tasks per day | May be empty | ❌ Not generating |
| Task Descriptions | Specific (module names, counts) | Generic | ⚠️ Incomplete |
| Start Button | Unified CTA | Individual task buttons | ⚠️ Missing |
| Time Tracking | Automatic + manual | Manual only | ⚠️ Missing |
| Summary Screen | After completion | Not implemented | ❌ Missing |
| Extra Review | Suggestion after completion | Not implemented | ❌ Missing |

### 3.3 Plan d'Étude

| Feature | Documentation | Current Implementation | Status |
|---------|--------------|----------------------|--------|
| Task Aggregation | Module-level grouping | Individual entries | ❌ Missing |
| Task Formatting | "Lire [module]", "X séances..." | Generic descriptions | ❌ Missing |
| Content Counting | Actual flashcard/activity counts | Not counted | ❌ Missing |
| Week Display | Accordion, current week expanded | ✅ Working | ✅ Working |
| Task Completion | Individual checkmarks | Status badges | ⚠️ Partial |

---

## 4. Questions for Clarification

### 4.1 Algorithm Selection

**Question 1:** Should we switch from `generateSimpleStudyPlan` to `generateEnhancedStudyPlan`?
- The enhanced algorithm exists and implements all requirements
- The simple algorithm is missing most features
- **Recommendation:** Yes, switch immediately

**Question 2:** Are there any reasons to keep the simple algorithm?
- Performance concerns?
- Testing purposes?
- Fallback for courses without content?

### 4.2 Plan du Jour Generation

**Question 3:** Why might today's plan be empty?
- Is the plan generation working but not creating entries for today?
- Are entries being created but not matching today's date?
- Should we always ensure at least 2-4 tasks for today?

**Question 4:** Should we generate today's plan on-demand if it's empty?
- If no entries for today, should we:
  - Generate tasks from the study plan algorithm?
  - Pull from upcoming tasks?
  - Show a message to complete orientation first?

### 4.3 Plan d'Étude Aggregation

**Question 5:** How should we aggregate tasks in the weekly plan?
- **LEARN tasks:** Group by module → "Lire [module title]" (one line per module)?
- **REVIEW tasks:** Count sessions → "X séances de 20 flashcards" or "X séances de révision intelligente"?
- **QUIZ tasks:** Group by module → "Quiz [module title]"?
- **PRACTICE tasks:** Identify mock exams → "Examen blanc", question banks → "X questions de pratique"?

**Question 6:** Should we show individual content items or only module-level?
- Documentation says "module-level granularity"
- But daily plan needs individual items
- Should weekly plan show aggregated, daily plan show detailed?

### 4.4 Task Descriptions

**Question 7:** What format should task descriptions use?
- **LEARN:** "Lire [module title]" or "Apprendre - [module title]"?
- **REVIEW:** "X séances de 20 flashcards" or "Révision - Modules 1-4"?
- **QUIZ:** "Quiz [module title]" or "Quiz chapitre [number]"?
- **PRACTICE:** "Examen blanc" or "Examen simulé"?

**Question 8:** Should we count actual flashcard IDs or estimate?
- Documentation says "count actual flashcard IDs"
- But `targetFlashcardIds` might contain prioritized subset
- Should we show "X séances de [count] flashcards" where count is actual IDs in the session?

### 4.5 Date Handling

**Question 9:** How should we handle Week 1 start date?
- If plan created on Wednesday, Week 1 starts Monday (2 days ago)
- Should today's plan show tasks from Week 1 even if plan was just created?
- Or should we only show tasks scheduled for today and future?

**Question 10:** Should we ensure tasks are always scheduled for today?
- If no tasks for today, should we:
  - Move upcoming tasks to today?
  - Generate new tasks for today?
  - Show empty state with message?

### 4.6 Phase 2 Review Sessions

**Question 11:** How should review sessions be described?
- Documentation says "all review sessions include all learned modules"
- Should we show: "Réviser modules 1-4" (module range)?
- Or: "X séances de 20 flashcards" (session count)?
- Or both?

**Question 12:** Should we aggregate multiple review sessions in the same week?
- If 3 review sessions in Week 2, show:
  - "3 séances de révision" (aggregated)?
  - Or list each session separately?

### 4.7 Implementation Priority

**Question 13:** What should we fix first?
1. Switch to enhanced algorithm (critical)
2. Fix plan du jour generation (critical)
3. Add task aggregation for plan d'étude (important)
4. Add missing features (time tracking, summary, etc.) (nice to have)

**Question 14:** Should we implement all features at once or incrementally?
- Big bang: Switch algorithm + fix both plans + add features
- Incremental: Fix algorithm first, then plan du jour, then plan d'étude, then features

---

## 5. Recommended Next Steps

### Immediate Actions (Critical)

1. **Switch to Enhanced Algorithm:**
   ```typescript
   // In app/actions/study-plan.ts
   // Change from:
   const result: SimpleStudyPlanResult = await generateSimpleStudyPlan(...)
   // To:
   const result: StudyPlanGenerationResult = await generateEnhancedStudyPlan(...)
   ```

2. **Fix Plan du Jour Generation:**
   - Ensure entries are created for today
   - Check date matching logic
   - Add fallback to generate tasks if empty

3. **Add Task Aggregation for Plan d'Étude:**
   - Create `lib/utils/weekly-plan-aggregator.ts`
   - Aggregate LEARN tasks by module
   - Count REVIEW sessions
   - Format task descriptions

### Short-term (Important)

4. **Add Missing Plan du Jour Features:**
   - "Start today's plan" unified CTA
   - Time tracking integration
   - Summary screen
   - Extra review session suggestion

5. **Improve Task Descriptions:**
   - Format according to documentation
   - Show actual counts
   - Use proper French formatting

### Long-term (Nice to Have)

6. **Add Advanced Features:**
   - Dynamic plan regeneration
   - Behind schedule detection
   - Ahead of schedule handling
   - Performance analytics

---

## 6. Code Changes Required

### 6.1 Switch to Enhanced Algorithm

**File:** `app/actions/study-plan.ts`

```typescript
// Line 16: Change import
import {
  generateEnhancedStudyPlan, // ✅ Change from generateSimpleStudyPlan
  type StudyPlanGenerationResult, // ✅ Change from SimpleStudyPlanResult
} from "@/lib/utils/enhanced-study-plan";

// Line 181: Change function call
const result: StudyPlanGenerationResult = await generateEnhancedStudyPlan(
  courseId,
  user.id,
  config
);
```

### 6.2 Fix Plan du Jour Date Matching

**File:** `app/actions/study-plan.ts`

```typescript
// In getTodaysPlanAction, ensure proper date matching
const today = new Date();
today.setHours(0, 0, 0, 0);

// Use date range to handle timezone issues
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const planEntries = await prisma.dailyPlanEntry.findMany({
  where: {
    userId: user.id,
    courseId: courseId,
    date: {
      gte: today,
      lt: tomorrow,
    },
  },
  // ... rest of query
});
```

### 6.3 Add Weekly Plan Aggregator

**File:** `lib/utils/weekly-plan-aggregator.ts` (NEW)

```typescript
export function aggregateWeeklyTasks(
  dailyEntries: DailyPlanEntry[],
  modules: Array<{ id: string; title: string; order: number }>
): WeeklyPlanWeek[] {
  // Group by week
  // Aggregate LEARN tasks by module
  // Count REVIEW sessions
  // Format task descriptions
  // Return aggregated weeks
}
```

---

## 7. Testing Checklist

- [ ] Plan generation creates entries for today
- [ ] Plan du jour displays 2-4 tasks
- [ ] Plan d'étude shows aggregated weekly tasks
- [ ] Task descriptions match documentation format
- [ ] Phase 1 schedules actual content items
- [ ] Phase 2 uses spaced repetition
- [ ] Phase 3 schedules mock exams properly
- [ ] Week 1 calculation is correct
- [ ] Date matching works across timezones
- [ ] Empty states handled gracefully

---

## Summary

**Main Issues:**
1. ❌ Using simple algorithm instead of enhanced
2. ❌ Plan du jour not generating (likely date/algorithm issue)
3. ❌ Plan d'étude incomplete (missing aggregation)

**Root Cause:**
The wrong algorithm is being used, which doesn't create proper daily entries or use actual content.

**Solution:**
Switch to enhanced algorithm, fix date matching, add aggregation logic.

