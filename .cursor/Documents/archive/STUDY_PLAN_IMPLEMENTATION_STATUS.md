# Study Plan Algorithm - Implementation Status

## ✅ FULLY IMPLEMENTED

### 1. Content Inventory System
**Status**: ✅ **COMPLETE**
- **File**: `lib/utils/course-content-inventory.ts`
- **Features**:
  - Counts actual videos, notes, quizzes per module
  - Counts flashcards and learning activities per module
  - Counts question banks and mock exams
  - Calculates estimated blocks: `(videos × 2) + (quizzes × 1) + (notes × 1)`
  - Calculates minimum study time: `(modules × 4) + (mockExams × 4)`

### 2. Block Calculations
**Status**: ✅ **COMPLETE**
- **File**: `lib/utils/study-plan.ts` (function: `calculateModuleBlocks`)
- **Implementation**: Videos = 2 blocks, Quiz = 1 block, Notes = 1 block
- **Used in**: Content inventory and enhanced study plan generation

### 3. Phase 1 Pace Algorithm
**Status**: ✅ **COMPLETE**
- **File**: `lib/utils/study-plan.ts` (function: `calculatePhase1Pace`)
- **Logic**:
  - Default: 3 modules/week (if enough time)
  - Exam soon: Closer to max (6/week)
  - Exam far: Closer to min (1/week)
  - Algorithm-determined, not user-selected

### 4. Phase 1 Sequential Learning
**Status**: ✅ **COMPLETE**
- **File**: `lib/utils/enhanced-study-plan.ts` (function: `generatePhase1Blocks`)
- **Features**:
  - Modules learned sequentially by `module.order`
  - Respects `modulesPerWeek` pace
  - Schedules actual content items (videos, notes, quizzes)
  - When module learned → unlocks for Phase 2

### 5. Week 1 Start Date Calculation
**Status**: ✅ **COMPLETE**
- **File**: `lib/utils/study-plan.ts` (function: `calculateWeek1StartDate`)
- **Logic**: Week 1 starts Monday of week containing start date, extends to ensure full week

### 6. Phase 2 Spaced Repetition
**Status**: ✅ **COMPLETE**
- **File**: `lib/utils/study-plan.ts` (function: `getSpacingIntervals`)
- **Intervals**: 1d, 4d, 10d, 21d (and 45d for long timelines)
- **File**: `lib/utils/enhanced-study-plan.ts` (function: `generatePhase2Blocks`)
- **Features**:
  - Schedules review sessions at spaced intervals after module is learned
  - Review sessions include ALL learned modules up to that point
  - Uses actual learned dates when available, estimates otherwise

### 7. Phase 2 Prioritization
**Status**: ✅ **COMPLETE**
- **File**: `lib/utils/enhanced-study-plan-prioritization.ts`
- **Features**:
  - Minimum coverage: 10 flashcards + 5 activities per module
  - Prioritizes difficult flashcards (based on self-rating from review sessions)
  - Prioritizes activities from modules with failed quizzes (score < 70%)

### 8. Phase 3 Mock Exam Scheduling
**Status**: ✅ **COMPLETE**
- **File**: `lib/utils/enhanced-study-plan.ts` (function: `generatePhase3Blocks`)
- **Logic**:
  - Last mock: 1 week before exam
  - Second-to-last: 2 weeks before exam
  - First: After Phase 1 completion
  - Remaining mocks: Distributed between Phase 1 end and second-to-last mock
  - Each mock exam = 4 blocks

### 9. Phase 3 Gate
**Status**: ✅ **COMPLETE**
- **File**: `lib/utils/phase3-gate.ts`
- **File**: `app/actions/study-plan.ts` (function: `checkPhase3AccessAction`)
- **Logic**: All modules must be marked as "LEARNED" before Phase 3 access
- **Returns**: Clear message listing unlearned modules

### 10. Minimum Study Time Check
**Status**: ✅ **IMPLEMENTED** (Backend only)
- **File**: `lib/utils/enhanced-study-plan.ts`
- **Calculation**: `(modules × 4) + (mockExams × 4)`
- **Warnings**: Generated and returned in `StudyPlanGenerationResult`
- **Issue**: ⚠️ Warnings are returned but may not be displayed in UI

### 11. Module Progress Tracking
**Status**: ✅ **COMPLETE**
- **File**: `app/actions/study-plan.ts` (function: `markModuleAsLearnedAction`)
- **Features**:
  - Tracks when modules are learned
  - Adds modules to review queue when marked as learned
  - Initializes module progress for all modules on plan generation

---

## ⚠️ PARTIALLY IMPLEMENTED / NEEDS VERIFICATION

### 1. Warning Display in UI
**Status**: ⚠️ **NEEDS VERIFICATION**
- **Backend**: Warnings are generated and returned from `generateStudyPlanAction`
- **Issue**: Need to verify if warnings are displayed to users in:
  - Orientation form completion
  - Settings update
  - Study plan regeneration
- **Files to check**: `components/course/orientation-form.tsx`, `components/course/study-plan-settings.tsx`

### 2. Continuous Minimum Study Time Warning
**Status**: ⚠️ **NOT IMPLEMENTED**
- **Requirement**: Show warning continuously if user is behind schedule
- **Current**: Only checked at plan generation
- **Needs**: Dashboard/UI component to show warning if `blocksAvailable < minimumStudyTime` or if behind schedule

### 3. Phase 3 Gate UI Enforcement
**Status**: ⚠️ **NEEDS VERIFICATION**
- **Backend**: `checkPhase3AccessAction` exists
- **Issue**: Need to verify if UI components check this before allowing Phase 3 access
- **Files to check**: `components/course/phase3-practice.tsx`, `components/course/phase-based-learning-interface.tsx`

---

## ❌ NOT IMPLEMENTED / MISSING

### 1. Question Bank Practice Distribution
**Status**: ⚠️ **PARTIALLY IMPLEMENTED**
- **Current**: Question banks are scheduled in Phase 3, but stored in `targetFlashcardIds` JSON (temporary workaround)
- **Issue**: Schema doesn't have dedicated field for question bank IDs
- **Note**: This is a minor issue - the functionality works but could be cleaner

### 2. Dynamic Plan Regeneration
**Status**: ❌ **NOT IMPLEMENTED**
- **Requirement**: Regenerate plan when:
  - Course content is added/removed
  - User falls behind schedule
  - User is ahead of schedule
- **Current**: Plan only regenerates when user updates settings or initializes

### 3. Behind Schedule Detection & Adjustment
**Status**: ❌ **NOT IMPLEMENTED**
- **Requirement**: Detect when user is behind schedule and:
  - Compress remaining schedule
  - Skip optional content
  - Suggest increasing study hours
- **Current**: No automatic adjustment

### 4. Ahead of Schedule Handling
**Status**: ❌ **NOT IMPLEMENTED**
- **Requirement**: If user is ahead, suggest:
  - Additional practice
  - Optional content
  - Early completion
- **Current**: No handling for ahead-of-schedule scenarios

---

## 🔍 POTENTIAL ISSUES / QUESTIONS

### 1. Phase 1 Block Distribution
**Question**: In `generatePhase1Blocks`, modules are scheduled day-by-day, but does this properly respect the `modulesPerWeek` constraint across the entire week?
- **Current**: Tracks `modulesThisWeek` but may need verification

### 2. Phase 2 Review Session Content
**Question**: Review sessions include "all learned modules" - but how are flashcards/activities actually selected for each session?
- **Current**: Uses prioritization functions, but may need to verify the actual selection logic

### 3. Phase 3 Question Bank Storage
**Question**: Question bank IDs are stored in `targetFlashcardIds` JSON - is this properly handled when displaying/executing practice sessions?
- **Current**: Temporary workaround - may need dedicated field

### 4. Warning Display
**Question**: Are warnings from plan generation actually shown to users?
- **Need to check**: `orientation-form.tsx`, `study-plan-settings.tsx`

### 5. Phase 3 Access UI Check
**Question**: Do UI components check `checkPhase3AccessAction` before allowing Phase 3 navigation?
- **Need to check**: Phase 3 components and navigation logic

---

## 📋 SUMMARY

### ✅ Core Algorithm: **FULLY IMPLEMENTED**
- Content inventory ✅
- Block calculations ✅
- Phase 1 pace & sequential learning ✅
- Phase 2 spaced repetition & prioritization ✅
- Phase 3 mock exam scheduling ✅
- Phase 3 gate ✅
- Minimum study time calculation ✅

### ⚠️ UI/UX Features: **NEEDS VERIFICATION**
- Warning display in UI
- Continuous minimum study time warnings
- Phase 3 gate UI enforcement

### ❌ Advanced Features: **NOT IMPLEMENTED**
- Dynamic plan regeneration
- Behind schedule detection & adjustment
- Ahead of schedule handling

---

## 🎯 RECOMMENDATIONS

1. **Verify Warning Display**: Check if warnings from plan generation are shown to users
2. **Add Continuous Warnings**: Show minimum study time warning on dashboard if behind schedule
3. **Verify Phase 3 Gate**: Ensure UI checks `checkPhase3AccessAction` before allowing Phase 3
4. **Consider Dynamic Regeneration**: Add option to regenerate plan when content changes or user is behind
5. **Question Bank Field**: Consider adding dedicated field for question bank IDs instead of using `targetFlashcardIds` JSON

---

## ❓ QUESTIONS FOR CLARIFICATION

1. **Warning Display**: Are warnings from plan generation currently shown to users? If not, where should they be displayed?
2. **Phase 3 Gate**: Is the Phase 3 gate check enforced in the UI, or only in backend?
3. **Question Bank Storage**: Is the current approach (storing in `targetFlashcardIds` JSON) acceptable, or should we add a dedicated field?
4. **Dynamic Regeneration**: Should the plan automatically regenerate when:
   - User falls behind schedule?
   - Course content is added/removed?
   - Or only when user manually requests it?
5. **Behind Schedule**: What should happen when user is behind schedule?
   - Compress remaining schedule?
   - Show warning only?
   - Suggest increasing study hours?





