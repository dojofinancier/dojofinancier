# Study Plan Algorithm - Implementation Summary

## ✅ All Questions Answered - Ready for Implementation

### Key Algorithm Decisions

1. **Phase 1 Pace**: Algorithm-determined (not user-selected)
   - Default: 3 modules/week (if enough time)
   - Exam soon → closer to max (6/week)
   - Exam far → closer to min (1/week)

2. **Mock Exams**: Option C
   - First mock: After Phase 1 completion
   - Second-to-last: 2 weeks before exam
   - Last: 1 week before exam

3. **Block Calculation**: Actual content calculation
   - Videos = 2 blocks
   - Phase 1 quiz = 1 block
   - Notes = 1 block
   - Most modules: 1 video + 1 notes + 1 quiz = 4 blocks

4. **Phase 2 Review**: Spaced repetition (1d, 4d, 10d, 21d)
   - All review sessions include ALL learned modules
   - Study plan shows: "Réviser modules 1-4"
   - Student can use Smart Review or manually select

5. **Prioritization**:
   - Difficult flashcards: Self-rating from review sessions
   - Failed quiz: Score < 70%
   - Coverage: Minimum per module (10 flashcards + 5 activities), regardless of content amount

6. **Phase 3 Gate**: All modules must be marked as "learned"
   - Clear message if trying to access Phase 3 without completing Phase 1

7. **Minimum Study Time**: `(modules × 4) + (mockExams × 4)`
   - Warning at: Plan generation, settings update, continuously if behind

8. **Week 1**: Starts Monday of week containing start date, extends to ensure full week

---

## Implementation Steps

### Step 1: Content Inventory Function
**File**: `lib/utils/course-content-inventory.ts` (NEW)

Count actual:
- Modules and their content (videos, notes, quizzes)
- Flashcards per module
- Learning activities per module
- Question banks
- Mock exams

### Step 2: Update Block Calculations
**File**: `lib/utils/study-plan.ts`

- Update to use: Videos = 2 blocks, Quiz = 1 block, Notes = 1 block
- Replace fixed estimates with actual content counts

### Step 3: Phase 1 Pace Algorithm
**File**: `lib/utils/study-plan.ts`

- Calculate modules per week based on time available
- Default: 3/week
- Adjust: Max 6/week if exam soon, min 1/week if exam far

### Step 4: Phase 1 Sequential Learning
**File**: `lib/utils/study-plan.ts` + `app/actions/study-plan.ts`

- Learn modules sequentially (by order)
- When module learned → unlock for Phase 2

### Step 5: Phase 2 Review Scheduling
**File**: `lib/utils/study-plan.ts`

- Spaced repetition: 1d, 4d, 10d, 21d after learning
- All review sessions include all learned modules
- Prioritize: Minimum per module + difficult items + failed quiz modules

### Step 6: Phase 3 Mock Exam Scheduling
**File**: `lib/utils/study-plan.ts`

- Last mock: Week before exam
- Second-to-last: 2 weeks before exam
- First: After Phase 1 completion

### Step 7: Phase 3 Gate
**File**: `app/actions/study-plan.ts` + UI components

- Check all modules marked as "learned"
- Show clear message if Phase 3 accessed without Phase 1 complete

### Step 8: Minimum Study Time Check
**File**: `lib/utils/study-plan.ts` + `app/actions/study-plan.ts`

- Calculate: `(modules × 4) + (mockExams × 4)`
- Warn at: Plan generation, settings update, continuously if behind

### Step 9: Week 1 Calculation
**File**: `lib/utils/study-plan.ts`

- Start Monday of week containing start date
- Extend to ensure full week

### Step 10: Update Plan Generation
**File**: `app/actions/study-plan.ts`

- Use content inventory
- Apply new algorithm
- Ensure all constraints are met

---

## Testing Scenarios

1. **2 modules, 8 weeks until exam** (current state)
2. **12 modules, 8 weeks until exam** (future state)
3. **12 modules, 4 weeks until exam** (compressed timeline)
4. **12 modules, 16 weeks until exam** (extended timeline)
5. **Different study hours** (4, 8, 12, 16 hours/week)
6. **Phase 3 gate** (try to access Phase 3 without completing Phase 1)
7. **Minimum study time warning** (insufficient hours)

---

## Next Steps

1. Create content inventory function
2. Update block calculations
3. Implement Phase 1 pace algorithm
4. Implement Phase 2 review scheduling
5. Implement Phase 3 mock exam scheduling
6. Add Phase 3 gate
7. Add minimum study time check
8. Update Week 1 calculation
9. Update plan generation action
10. Test with various scenarios

