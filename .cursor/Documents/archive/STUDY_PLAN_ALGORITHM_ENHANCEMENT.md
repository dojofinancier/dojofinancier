# Study Plan Algorithm Enhancement Plan

## Current Algorithm Analysis

### Current Limitations

The existing `generateStudyBlocks` function has several limitations:

1. **Fixed Estimates**: Uses `averageContentItemsPerModule = 5` (hardcoded)
2. **Round-Robin Module Selection**: Simply cycles through modules without considering:
   - Actual module content (videos, quizzes, flashcards)
   - Module complexity/difficulty
   - Module dependencies
3. **No Content Awareness**: Doesn't count actual:
   - Content items per module
   - Flashcards available
   - Learning activities available
   - Question banks/MCQs available
   - Mock exams available
4. **Simple Distribution**: Allocates blocks by phase percentages but doesn't ensure:
   - All modules are covered
   - All flashcards are reviewed
   - All activities are completed
   - Mock exams are scheduled

### Current Flow

```
User Settings (exam date, study hours, self-rating)
  ↓
Calculate weeks until exam
  ↓
Calculate blocks per week
  ↓
Determine phase distribution (Learn/Review/Practice ratios)
  ↓
Generate blocks day by day
  ↓
Round-robin through modules for Learn tasks
  ↓
Create generic Review/Practice tasks
```

**Problem**: This doesn't adapt to actual course content!

---

## Enhanced Algorithm Design

### Phase 1: Content Inventory

**Before generating plan, inventory all course content:**

```typescript
interface CourseContentInventory {
  modules: Array<{
    id: string;
    title: string;
    order: number;
    contentItems: number; // Videos, notes, etc.
    quizzes: number;
    flashcards: number;
    learningActivities: number;
    estimatedBlocks: number; // Based on actual content
  }>;
  totalFlashcards: number;
  totalLearningActivities: number;
  totalQuestionBanks: number;
  mockExams: number;
  totalEstimatedBlocks: {
    learn: number;
    review: number; // Based on spaced repetition schedule
    practice: number;
  };
}
```

**Calculation Logic:**
- **Learn blocks per module**: Count actual content items (videos, notes) + quizzes
  - 1 video = 1 block
  - 1 mini-quiz = 0.5 blocks
  - Notes = 0.5 blocks
- **Review blocks**: Calculate based on spaced repetition schedule
  - Initial review: 1 block per module (first pass)
  - Spaced reviews: Based on intervals (1d, 4d, 10d, etc.)
  - Total review blocks = initial + spaced repetition reviews
- **Practice blocks**: 
  - Mock exams: 4 blocks each
  - Question bank drills: 1-2 blocks each
  - Total = (mock exams × 4) + (question banks × 1.5)

### Phase 2: Adaptive Distribution

**Distribute content evenly across available time:**

```typescript
function distributeContentAcrossWeeks(
  inventory: CourseContentInventory,
  weeksUntilExam: number,
  blocksPerWeek: number,
  phaseDistribution: PhaseAllocation
): WeeklyContentPlan[]
```

**Algorithm:**

1. **Calculate Total Blocks Available**
   ```
   totalBlocksAvailable = weeksUntilExam × blocksPerWeek
   ```

2. **Calculate Total Blocks Required**
   ```
   totalBlocksRequired = inventory.totalEstimatedBlocks.learn 
                       + inventory.totalEstimatedBlocks.review
                       + inventory.totalEstimatedBlocks.practice
   ```

3. **Feasibility Check**
   - If `totalBlocksRequired > totalBlocksAvailable`:
     - Calculate compression ratio
     - Prioritize essential content
     - Warn user or suggest "high-yield" path

4. **Distribute Learn Tasks**
   - Sort modules by order
   - Calculate blocks per module based on actual content
   - Distribute modules across weeks based on phase distribution
   - Ensure all modules are scheduled before exam

5. **Distribute Review Tasks**
   - Calculate spaced repetition schedule for all flashcards/activities
   - Distribute review sessions across weeks
   - More reviews in middle weeks (Review phase)
   - Fewer reviews in early weeks (Learn phase)

6. **Distribute Practice Tasks**
   - Schedule mock exams:
     - First mock: ~2 weeks before exam
     - Second mock: ~1 week before exam
   - Distribute question bank drills:
     - More in Practice phase (final weeks)
     - Fewer in early weeks

### Phase 3: Content-Aware Block Generation

**Enhanced `generateStudyBlocks` function:**

```typescript
function generateContentAwareStudyBlocks(
  config: StudyPlanConfig,
  inventory: CourseContentInventory,
  startDate: Date,
  endDate: Date
): StudyBlock[]
```

**Key Improvements:**

1. **Module Selection**: Instead of round-robin, use a queue:
   - Track which modules have been started
   - Prioritize completing started modules before starting new ones
   - Ensure all modules are covered

2. **Flashcard Distribution**:
   - Calculate total flashcards
   - Distribute across review blocks
   - Ensure each flashcard gets reviewed multiple times (spaced repetition)

3. **Activity Distribution**:
   - Calculate total learning activities
   - Distribute across review blocks
   - Mix with flashcards in review sessions

4. **Quiz Scheduling**:
   - Schedule module quizzes after module is learned
   - Schedule mock exams at appropriate times
   - Distribute question bank practice

### Phase 4: Dynamic Adaptation

**As content is added/removed, regenerate plan:**

- When new module added: Recalculate and redistribute
- When flashcards added: Add to review schedule
- When activities added: Add to review schedule
- When user completes tasks: Adjust remaining schedule

---

## Implementation Strategy

### Step 1: Create Content Inventory Function

**File**: `lib/utils/course-content-inventory.ts` (NEW)

```typescript
export async function getCourseContentInventory(
  courseId: string
): Promise<CourseContentInventory>
```

**Queries:**
- Count modules and their content
- Count flashcards per module
- Count learning activities per module
- Count question banks
- Count mock exams
- Calculate estimated blocks for each

### Step 2: Enhance Block Estimation

**Update**: `lib/utils/study-plan.ts`

- Replace fixed `averageContentItemsPerModule` with actual counts
- Calculate blocks based on real content
- Add functions for content-aware distribution

### Step 3: Update Plan Generation

**Update**: `app/actions/study-plan.ts`

- Call `getCourseContentInventory` before generating plan
- Use inventory to distribute content
- Ensure all content is covered

### Step 4: Add Regeneration Logic

- When course content changes, offer to regenerate plan
- When user is behind, suggest plan adjustment
- When user is ahead, suggest additional practice

---

## Example: 12 Modules, 500 Activities, 2 Mock Exams

### Content Inventory

```
Modules: 12
  - Average content items per module: 8
  - Total learn blocks: 12 × 8 × 1.5 = 144 blocks

Flashcards: 300
  - Initial review: 12 modules × 1 block = 12 blocks
  - Spaced repetition (5 intervals): 300 × 5 = 1500 reviews
  - At 20 flashcards per session: 1500 / 20 = 75 sessions
  - Total review blocks: 12 + 75 = 87 blocks

Learning Activities: 500
  - Initial review: 12 modules × 1 block = 12 blocks
  - Spaced repetition: 500 × 5 = 2500 reviews
  - At 10 activities per session: 2500 / 10 = 250 sessions
  - Total review blocks: 12 + 250 = 262 blocks

Question Banks: 500 MCQs
  - Practice sessions: 500 / 20 = 25 sessions
  - Total practice blocks: 25 × 1.5 = 37.5 blocks

Mock Exams: 2
  - Total practice blocks: 2 × 4 = 8 blocks

Total Required:
  - Learn: 144 blocks
  - Review: 87 + 262 = 349 blocks
  - Practice: 37.5 + 8 = 45.5 blocks
  - Total: 538.5 blocks
```

### Distribution Example (8 weeks, 12 blocks/week = 96 blocks total)

**Problem**: 538.5 blocks required but only 96 available!

**Solution**: Compression and prioritization

1. **Compress Review Schedule**:
   - Reduce spaced repetition intervals
   - Focus on high-priority flashcards/activities
   - Combine flashcards and activities in same sessions

2. **Prioritize Content**:
   - Essential modules first
   - Core flashcards/activities
   - At least 1 mock exam

3. **Adaptive Scheduling**:
   - More blocks in early weeks (Learn phase)
   - Compressed review in middle weeks
   - Practice-heavy in final weeks

---

## Recommendations

### For Your Use Case

1. **Content-Aware Algorithm**: Implement inventory system to count actual content
2. **Adaptive Distribution**: Distribute based on actual content, not estimates
3. **Feasibility Warnings**: Alert users when content is too much for available time
4. **High-Yield Path**: Offer option to focus on essential content when behind
5. **Dynamic Regeneration**: Allow plan to adapt as content is added

### Implementation Priority

1. **Phase 1** (Critical): Content inventory + adaptive distribution
2. **Phase 2** (Important): Spaced repetition scheduling for reviews
3. **Phase 3** (Nice to have): Dynamic regeneration on content changes

---

## Questions for You

1. **Module Prioritization**: Should some modules be marked as "essential" vs "optional"?
2. **Content Weighting**: Should certain types of content (videos vs activities) be weighted differently?
3. **Review Frequency**: How many times should each flashcard/activity be reviewed? (Current: 5 intervals)
4. **Behind Schedule Handling**: If user falls behind, should we:
   - Compress remaining schedule?
   - Skip optional content?
   - Extend study hours recommendation?
5. **Ahead of Schedule**: If user is ahead, should we:
   - Add extra practice?
   - Add optional content?
   - Allow early completion?

