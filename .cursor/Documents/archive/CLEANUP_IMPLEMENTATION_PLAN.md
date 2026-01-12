# Cleanup Implementation Plan

**Date**: January 2025  
**Status**: Ready to Execute  
**Based on**: `CLEANUP_STRATEGY.md`

---

## Quick Reference: Files to Keep vs Archive

### ✅ KEEP (Active Documentation - ~10 files)

**Location**: `.cursor/Documents/`

1. `MASTERPLAN.md` - Main project plan
2. `PERFORMANCE_OPTIMIZATION_IMPLEMENTATION_STATUS.md` - Current status tracker
3. `COMPREHENSIVE_PERFORMANCE_OPTIMIZATION_PLAN.md` - Master optimization plan
4. `PHASE_3_4_OPTIMIZATION_IMPLEMENTATION.md` - Latest phase summary
5. `ADDITIONAL_OPTIMIZATIONS.md` - Latest optimizations
6. `STUDY_PLAN_NEW_REQUIREMENTS_ANALYSIS.md` - Current requirements
7. `STUDY_PLAN_ALGORITHM_CLARIFICATIONS.md` - Current algorithm docs
8. `CLEANUP_STRATEGY.md` - This cleanup plan
9. `LEARNING_ACTIVITIES_IMPLEMENTATION.md` - Active feature docs
10. `STUDENT_LEARNING_ACTIVITIES_IMPLEMENTATION.md` - Active feature docs
11. `TROUBLESHOOTING_LEARNING_ACTIVITIES.md` - Active troubleshooting guide
12. `GOOGLE_ANALYTICS_SETUP.md` - Active setup guide
13. `README_GOOGLE_ANALYTICS.md` - Active readme (move from root)

---

## 📋 Step-by-Step Execution Plan

### Step 1: Create Archive Structure ✅

```bash
# Create archive folders
mkdir -p .cursor/Documents/archive/performance
mkdir -p .cursor/Documents/archive/study-plan
mkdir -p .cursor/Documents/archive/routes
mkdir -p .cursor/Documents/archive/features
mkdir -p .cursor/Documents/archive/chats
mkdir -p .cursor/Documents/assets
```

### Step 2: Archive Performance Documentation

**Move to**: `.cursor/Documents/archive/performance/`

- `ADDITIONAL_PERFORMANCE_OPTIMIZATIONS.md`
- `PERFORMANCE_OPTIMIZATION_PLAN.md`
- `PERFORMANCE_OPTIMIZATION_STATUS.md`
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md`
- `PERFORMANCE_OPTIMIZATION_FINAL_SUMMARY.md`
- `PERFORMANCE_IMPROVEMENTS_SUMMARY.md`
- `OPTIMIZATION_IMPLEMENTATION_SUMMARY.md`
- `PERFORMANCE_BOTTLENECK_ANALYSIS.md`
- `PERFORMANCE_TEST_RESULTS.md`
- `BROWSER_PERFORMANCE_ANALYSIS.md`
- `BROWSER_PERFORMANCE_TEST.md`
- `FINAL_PERFORMANCE_RECOMMENDATIONS.md`
- `PERFORMANCE_OPTIMIZATION_QUICK_WINS.md`
- `PHASE_2_OPTIMIZATION_IMPLEMENTATION.md`
- `OPTIMISTIC_UPDATES_IMPLEMENTATION.md`
- `REACT_QUERY_CONVERSION_PROGRESS.md`
- `TAB_CACHING_FIX.md`

### Step 3: Archive Study Plan Documentation

**Move to**: `.cursor/Documents/archive/study-plan/`

- `STUDY_PLAN_IMPLEMENTATION_COMPLETE.md`
- `STUDY_PLAN_IMPLEMENTATION_SPEC.md`
- `STUDY_PLAN_IMPLEMENTATION_STATUS.md`
- `STUDY_PLAN_IMPLEMENTATION_ANALYSIS.md`
- `STUDY_PLAN_FIXES_APPLIED.md`
- `STUDY_PLAN_COMPREHENSIVE_FIXES.md`
- `STUDY_PLAN_ALGORITHM_IMPLEMENTATION_SUMMARY.md`
- `STUDY_PLAN_ALGORITHM_ENHANCEMENT.md`
- `TODAYS_PLAN_IMPLEMENTATION_PLAN.md`
- `ANALYTICS_PROGRESS_TRACKING_PLAN.md`
- `SMART_REVIEW_IMPLEMENTATION_PLAN.md`

### Step 4: Archive Route & Redirect Documentation

**Move to**: `.cursor/Documents/archive/routes/`

- `ROUTE_MIGRATION_COMPLETE.md`
- `ROUTE_TRANSLATION_PROGRESS.md`
- `ROUTE_TEST_REPORT.md`
- `ROUTE_TESTING_CHECKLIST.md`
- `ROUTE_TEST_FAILURE_CRITERIA.md`
- `REDIRECT_FIX_IMPLEMENTATION.md`
- `REDIRECT_ISSUE_ANALYSIS.md`
- `REDIRECT_ISSUE_DIAGNOSIS.md`
- `ENGLISH_URL_TERMS_AUDIT.md`
- `COURSE_SLUG_MIGRATION_PLAN.md`

### Step 5: Archive Feature Documentation

**Move to**: `.cursor/Documents/archive/features/`

- `ERROR_HANDLING_IMPLEMENTATION.md`
- `COHORT_DASHBOARD_UI_UX.md`
- `CONTENT_GENERATION_STRATEGY.md`
- `CONTENT_QUICKSTART_CHECKLIST.md`
- `STACK_ANALYSIS.md`
- `stack.md` (duplicate)
- `WEBHOOK_IMPLEMENTATION_SUMMARY.md` (move from root)
- `WEBHOOK_ARCHITECTURE_ANALYSIS.md` (move from root)
- `WEBHOOKS_SETUP.md` (move from root if not active)

### Step 6: Archive Chat Logs

**Move entire folder**: `chats/` → `.cursor/Documents/archive/chats/`

### Step 7: Organize Root-Level Files

**Move to `.cursor/Documents/`**:
- `LEARNING_ACTIVITIES_IMPLEMENTATION.md`
- `STUDENT_LEARNING_ACTIVITIES_IMPLEMENTATION.md`
- `TROUBLESHOOTING_LEARNING_ACTIVITIES.md`
- `README_GOOGLE_ANALYTICS.md`

**Move to `.cursor/Documents/archive/`**:
- `IMPLEMENTATION_SUMMARY.md`
- `AVAILABILITY_SYSTEM_CHANGES.md`

**Keep in root** (or check usage):
- `about.md` - Check if used in app
- `prompts.md` - Keep if still used

### Step 8: Handle Data Files

**CSV Files - Check Usage First**:

1. **Root CSV files**:
   - `Jflashcards Vol 1.csv` - Check if imported
   - `tutor-quiz-Examen pratique 1.csv` - Check if imported
   - `tutor-quiz-Quiz Chapitre 1 à 3.csv` - Check if imported

2. **Public CSV files**:
   - `public/quiz-ccvm1-*.csv` - Check if used for imports

**Action**:
- If used: Move to `scripts/data/imports/`
- If unused: Delete or archive
- Templates stay in `templates/learning-activities/`

### Step 9: Handle FIN3500-platform Folder

**Investigation Needed**:
- Only 1 reference found: Comment in `module-detail-page.tsx` mentioning "from FIN3500-platform"
- Appears to be old/separate project

**Options**:
1. **Archive**: Move to `archive/fin3500-platform/`
2. **Delete**: If confirmed unused
3. **Keep**: If still needed for reference

**Recommendation**: Archive first, can delete later if confirmed unused

### Step 10: CSS Files Cleanup

**Files**:
- `app/globals.css` - ✅ Keep (main styles, imported in layout.tsx)
- `global.css` (root) - ⚠️ Check if duplicate
- `newstyle.css` (root) - ⚠️ Check usage

**Findings**:
- `newstyle.css` was merged into `app/globals.css` (from chat logs)
- `global.css` in root - likely duplicate

**Action**:
- Delete `newstyle.css` (already merged)
- Check if `global.css` (root) is used, if not delete

### Step 11: Review Scripts

**Location**: `scripts/`

**Keep** (Active maintenance):
- `create-admin-user.ts`
- `dev.js` / `dev.ps1`
- `generate-course-slugs.ts`
- `populate-slugs.ts`
- `manual-regenerate-plan.ts`

**Review** (One-time migrations):
- `cleanup-appointment-availability.ts` - Check if still needed
- `cleanup-error-logs.ts` - Check if still needed
- `test-routes.ts` - Check if still needed
- `update-internal-links.ts` - Check if still needed

**Action**: Move one-time scripts to `scripts/archive/` or delete

---

## 🎯 Execution Order

1. ✅ Create archive structure
2. ✅ Archive documentation (Steps 2-6)
3. ✅ Organize root files (Step 7)
4. ⚠️ Handle data files (Step 8) - **Requires verification**
5. ⚠️ Handle FIN3500-platform (Step 9) - **Requires decision**
6. ✅ Cleanup CSS files (Step 10)
7. ⚠️ Review scripts (Step 11) - **Requires verification**

---

## ⚠️ Pre-Execution Checklist

Before starting cleanup:

- [ ] **Backup**: Ensure git is up to date
- [ ] **Search**: Run full codebase search for file references
- [ ] **Test**: Current build works
- [ ] **Verify**: CSV files usage
- [ ] **Decide**: FIN3500-platform folder fate

---

## 📝 Post-Cleanup Verification

After cleanup:

- [ ] Run `npm run build` - Should succeed
- [ ] Run `npm run lint` - Should pass
- [ ] Check for broken imports
- [ ] Verify app runs correctly
- [ ] Update `.gitignore` if needed

---

## 🔄 Rollback Plan

If issues occur:

1. All files moved to archive (not deleted)
2. Can restore from archive if needed
3. Git history available for reference

---

**Ready to execute?** Review this plan, then proceed step by step.
