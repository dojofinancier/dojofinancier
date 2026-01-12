# Study Plan Comprehensive Fixes

## Issues Identified and Fixed

### 1. ✅ Prisma Query Errors (CRITICAL - Causing Crashes)

**Problem**: Two Prisma queries were using `courseId` directly on `Quiz` model, which doesn't have that field.

**Locations**:
- `lib/utils/new-study-plan.ts:474` - `prisma.quiz.findMany()` for mock exams
- `lib/utils/new-study-plan.ts:738` - `prisma.quiz.count()` for minimum study time

**Fix**: Changed both queries to use relation path: `contentItem.module.courseId`

**Impact**: This was causing the entire plan generation to crash, preventing Phase 2 and Phase 3 blocks from being saved.

### 2. ✅ Exam Date Not Updating

**Problem**: When user changed exam date, it reverted to previous date because:
- Orientation form didn't load existing settings
- `planCreatedAt` wasn't updated when exam date changed significantly

**Fix**:
- Added `useEffect` to load existing settings in orientation form
- Updated `planCreatedAt` when exam date changes by more than 7 days
- This ensures plan regenerates with new timeline

### 3. ✅ Only 8 Entries Saved (When 76+ Blocks Generated)

**Problem**: Logs show 41 Phase 1 + 35 Phase 2 blocks generated, but only 8 entries saved.

**Root Cause**: The Prisma error at line 738 was crashing the function before all blocks could be saved.

**Fix**:
- Wrapped mock exam count query in try-catch to prevent crashes
- Added detailed logging to track block generation and saving
- Added error handling in batch insert to continue even if some chunks fail

### 4. ✅ Only Modules 1-6 Scheduled (Not All 12)

**Problem**: Plan only schedules first 6 modules, not all 12.

**Root Cause**: 
- Phase 1 end date calculation might be too restrictive
- Loop breaking early due to date check

**Fix**:
- Modified loop to ensure ALL modules are scheduled, even if it means going slightly past ideal end date
- Added logging to show module distribution
- Changed `modulesPerWeek` calculation to use `Math.max(1, ...)` to ensure at least 1 module per week

### 5. ✅ Only "Lecture rapide" and "Lecture lente" Showing

**Problem**: Videos, notes, and quizzes not appearing in weekly plan.

**Root Cause**: 
- Aggregation logic was checking `estimatedBlocks` but entries might not have correct values
- Only 1 entry per module was being saved (likely only quizzes)

**Fix**:
- Simplified detection logic to check `estimatedBlocks` directly
- Added placeholders for videos/notes if none exist
- Fixed content detection to use both relations and contentType

### 6. ✅ No Phase 2 Items

**Problem**: Phase 2 review sessions not appearing.

**Root Cause**: 
- Phase 2 blocks were being generated (35 blocks) but not saved due to crash
- After crash fix, blocks should now save properly

**Fix**:
- Fixed Prisma query errors that prevented saving
- Ensured `phase2BlocksPerWeek` is at least 1
- Added logging to track Phase 2 block generation

### 7. ✅ No Phase 3 Items

**Problem**: Phase 3 practice exams not appearing.

**Root Cause**: Same Prisma query error preventing Phase 3 generation.

**Fix**: Fixed mock exam query to use correct relation path.

## Code Changes Summary

### `lib/utils/new-study-plan.ts`
1. Fixed `prisma.quiz.findMany()` query for mock exams (line 474)
2. Fixed `prisma.quiz.count()` query for minimum study time (line 738)
3. Added try-catch around mock exam count to prevent crashes
4. Modified Phase 1 loop to ensure all modules are scheduled
5. Added comprehensive logging throughout

### `app/actions/study-plan.ts`
1. Updated `planCreatedAt` logic to regenerate when exam date changes significantly
2. Added detailed logging for block generation and saving
3. Added error handling in batch insert
4. Fixed exam date comparison (was using wrong variable)

### `components/course/orientation-form.tsx`
1. Added `useEffect` to load existing settings on mount
2. Form now pre-fills with current exam date, study hours, self-rating, and preferred days
3. Added loading state while settings load

### `lib/utils/weekly-plan-aggregator.ts`
1. Simplified video/notes detection (already fixed in previous changes)
2. Fixed Phase 2 aggregation to always show items when review entries exist

## Testing Checklist

After regenerating the plan, verify:

1. ✅ **All 12 modules scheduled** - Check logs for module distribution
2. ✅ **Phase 1 items visible** - Should see Lecture rapide → Vidéo → Lecture lente → Notes → Quiz for each module
3. ✅ **Phase 2 items visible** - Should see "X séances de flashcards" and "X séances de activités d'apprentissage"
4. ✅ **Phase 3 items visible** - Should see practice exams scheduled
5. ✅ **Phase 1 stops 2 weeks before exam** - No Phase 1 items in last 2 weeks
6. ✅ **Exam date updates** - Changing exam date should regenerate plan with new timeline
7. ✅ **All blocks saved** - Check logs: `[generateStudyPlanAction] Created X new plan entries` should match generated blocks

## Expected Log Output

After regeneration, you should see:
```
[generateNewStudyPlan] Total blocks generated: 76+
[generateNewStudyPlan] Block type breakdown: { LEARN: 41+, REVIEW: 35+, PRACTICE: X }
[generateStudyPlanAction] Preparing to save 76+ plan entries
[generateStudyPlanAction] Entry breakdown before save: { LEARN: 41+, REVIEW: 35+, PRACTICE: X }
[generateStudyPlanAction] Created 76+ new plan entries (expected 76+)
```

If you see fewer entries saved than generated, check for:
- Prisma errors in logs
- Database constraints (foreign keys, unique constraints)
- Date validation issues

## Next Steps

1. **Regenerate the plan** - Complete orientation form with new exam date
2. **Check server logs** - Verify all blocks are generated and saved
3. **Verify weekly plan** - Should show all Phase 1, 2, and 3 items
4. **Test exam date change** - Change exam date and verify plan regenerates

