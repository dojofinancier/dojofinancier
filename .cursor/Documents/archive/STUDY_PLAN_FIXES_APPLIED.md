# Study Plan Fixes Applied

## Issues Fixed

### 1. Phase 1 Not Stopping 2 Weeks Before Exam ✅

**Problem**: Phase 1 was showing in week 12 for a 13-week plan (should stop at week 11).

**Fix**:
- Changed Phase 1 end date calculation to use the **end of the week** that is 2 weeks before exam
- Added date filtering in `generatePhase1Blocks` to ensure no blocks are created after Phase 1 end date
- Added filtering in `aggregateWeeklyTasks` to exclude Phase 1 entries after Phase 1 end week

**Code Changes**:
- `lib/utils/new-study-plan.ts`: Calculate `phase1EndDate` as end of week (Sunday) that is 2 weeks before exam
- `lib/utils/weekly-plan-aggregator.ts`: Filter out Phase 1 entries where `weekNumber > phase1EndWeek`

### 2. Phase 1 Items (Vidéo, Notes, Quiz) Not Showing ✅

**Problem**: Only "Lecture rapide" and "Lecture lente" were showing, not videos, notes, or quizzes.

**Fix**:
- Simplified detection logic - no longer queries database
- Videos: Entries with `targetContentItemId`, `estimatedBlocks === 2`, and no `targetQuizId`
- Notes: Entries with `targetContentItemId`, `estimatedBlocks === 1`, and no `targetQuizId`
- Quizzes: Entries with `targetQuizId`

**Code Changes**:
- `lib/utils/weekly-plan-aggregator.ts`: Simplified `aggregateLearnTasks` to check `estimatedBlocks` directly

### 3. Phase 2 Items Not Showing ✅

**Problem**: Phase 2 review sessions (flashcards and activities) were not appearing in the weekly plan.

**Fix**:
- Ensured Phase 2 blocks per week is at least 1 (was sometimes 0)
- Fixed aggregation to always show Phase 2 items when review entries exist
- Split review entries 50/50 between flashcards and activities

**Code Changes**:
- `lib/utils/new-study-plan.ts`: `phase2BlocksPerWeek` now has `Math.max(1, phase2BlocksPerWeek)` to ensure at least 1 block
- `lib/utils/weekly-plan-aggregator.ts`: Always show Phase 2 items if review entries exist, split 50/50

### 4. Removed "(hors plateforme)" Text ✅

**Fix**: Removed from component display as requested.

**Code Changes**:
- `components/course/study-plan.tsx`: Removed the "(hors plateforme)" span

## Debugging Added

Added comprehensive console logging to help troubleshoot:
- `[generateNewStudyPlan]`: Block generation counts
- `[generatePhase1Blocks]`: Module content counts (videos, notes, quizzes)
- `[generatePhase2Blocks]`: Phase 2 block generation details
- `[generateStudyPlanAction]`: Entry creation breakdown
- `[aggregateLearnTasks]`: Module detection results
- `[aggregateReviewTasks]`: Review entry counts and splitting

## Testing Checklist

After regenerating the plan, check:

1. ✅ Phase 1 stops at week 11 for a 13-week plan (exam in week 13)
2. ✅ Phase 1 shows: Lecture rapide → Vidéo → Lecture lente → Notes → Quiz for each module
3. ✅ Phase 2 shows: "X séances de flashcards" and "X séances de activités d'apprentissage"
4. ✅ No "(hors plateforme)" text appears
5. ✅ Check console logs to verify blocks are being generated correctly

## Next Steps

If issues persist:
1. Check browser console for debug logs
2. Verify modules have content items (videos, notes, quizzes) in database
3. Verify Phase 2 blocks are being created (check `phase2BlocksPerWeek` value)
4. Regenerate the plan after making changes

