# Codebase Cleanup Strategy

**Date**: January 2025  
**Status**: 📋 Planning  
**Goal**: Clean up codebase following Next.js 16 best practices

---

## Executive Summary

This document outlines a comprehensive cleanup strategy to:
1. Remove duplicate/outdated documentation
2. Archive old chat logs and conversation files
3. Organize documentation following best practices
4. Remove unused files and dependencies
5. Consolidate duplicate implementations
6. Improve folder structure

---

## 📁 Current Structure Analysis

### Issues Identified:

1. **Documentation Overload** (52+ markdown files in `.cursor/Documents/`)
   - Multiple performance optimization docs (10+ files)
   - Duplicate study plan implementation docs (8+ files)
   - Old/outdated implementation summaries

2. **Root-Level Clutter**
   - Multiple markdown files in root
   - CSV files mixed with code
   - Old chat logs in `/chats` folder

3. **Unused/Deprecated Code**
   - `FIN3500-platform/` folder (151 files) - appears to be old/separate project
   - `newstyle.css` - potential duplicate
   - Old SQL migrations in FIN3500-platform

4. **Inconsistent Organization**
   - Documentation scattered across root and `.cursor/Documents/`
   - No clear archive structure

---

## 🎯 Cleanup Strategy

### Phase 1: Documentation Consolidation

#### 1.1 Keep (Active Documentation)
**Location**: `.cursor/Documents/`

**Essential Files to Keep**:
- `MASTERPLAN.md` - Main project plan
- `PERFORMANCE_OPTIMIZATION_IMPLEMENTATION_STATUS.md` - Current status
- `COMPREHENSIVE_PERFORMANCE_OPTIMIZATION_PLAN.md` - Master plan
- `PHASE_3_4_OPTIMIZATION_IMPLEMENTATION.md` - Latest phase summary
- `ADDITIONAL_OPTIMIZATIONS.md` - Latest optimizations
- `STUDY_PLAN_NEW_REQUIREMENTS_ANALYSIS.md` - Current requirements
- `STUDY_PLAN_ALGORITHM_CLARIFICATIONS.md` - Current algorithm docs

**Action**: Keep ~7-10 essential files, archive the rest

#### 1.2 Archive (Historical Documentation)
**Location**: `.cursor/Documents/archive/`

**Files to Archive**:
- `ADDITIONAL_PERFORMANCE_OPTIMIZATIONS.md` (duplicate of ADDITIONAL_OPTIMIZATIONS.md)
- `PERFORMANCE_OPTIMIZATION_PLAN.md` (superseded by COMPREHENSIVE)
- `PERFORMANCE_OPTIMIZATION_STATUS.md` (superseded by IMPLEMENTATION_STATUS)
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md` (superseded by IMPLEMENTATION_STATUS)
- `PERFORMANCE_OPTIMIZATION_FINAL_SUMMARY.md` (historical)
- `PERFORMANCE_IMPROVEMENTS_SUMMARY.md` (historical)
- `OPTIMIZATION_IMPLEMENTATION_SUMMARY.md` (historical)
- `PERFORMANCE_BOTTLENECK_ANALYSIS.md` (historical)
- `PERFORMANCE_TEST_RESULTS.md` (historical)
- `BROWSER_PERFORMANCE_ANALYSIS.md` (historical)
- `BROWSER_PERFORMANCE_TEST.md` (historical)
- `FINAL_PERFORMANCE_RECOMMENDATIONS.md` (historical)
- `PERFORMANCE_OPTIMIZATION_QUICK_WINS.md` (historical)
- `PHASE_2_OPTIMIZATION_IMPLEMENTATION.md` (completed, can archive)
- `OPTIMISTIC_UPDATES_IMPLEMENTATION.md` (completed, can archive)
- `REACT_QUERY_CONVERSION_PROGRESS.md` (completed, can archive)
- `TAB_CACHING_FIX.md` (completed, can archive)
- `STUDY_PLAN_IMPLEMENTATION_COMPLETE.md` (completed)
- `STUDY_PLAN_IMPLEMENTATION_SPEC.md` (superseded)
- `STUDY_PLAN_IMPLEMENTATION_STATUS.md` (superseded)
- `STUDY_PLAN_IMPLEMENTATION_ANALYSIS.md` (historical)
- `STUDY_PLAN_FIXES_APPLIED.md` (completed)
- `STUDY_PLAN_COMPREHENSIVE_FIXES.md` (completed)
- `STUDY_PLAN_ALGORITHM_IMPLEMENTATION_SUMMARY.md` (historical)
- `STUDY_PLAN_ALGORITHM_ENHANCEMENT.md` (historical)
- `ROUTE_MIGRATION_COMPLETE.md` (completed)
- `ROUTE_TRANSLATION_PROGRESS.md` (completed)
- `ROUTE_TEST_REPORT.md` (completed)
- `ROUTE_TESTING_CHECKLIST.md` (completed)
- `ROUTE_TEST_FAILURE_CRITERIA.md` (completed)
- `REDIRECT_FIX_IMPLEMENTATION.md` (completed)
- `REDIRECT_ISSUE_ANALYSIS.md` (completed)
- `REDIRECT_ISSUE_DIAGNOSIS.md` (completed)
- `ENGLISH_URL_TERMS_AUDIT.md` (completed)
- `COURSE_SLUG_MIGRATION_PLAN.md` (completed)
- `ERROR_HANDLING_IMPLEMENTATION.md` (completed)
- `COHORT_DASHBOARD_UI_UX.md` (completed)
- `TODAYS_PLAN_IMPLEMENTATION_PLAN.md` (completed)
- `ANALYTICS_PROGRESS_TRACKING_PLAN.md` (completed)
- `SMART_REVIEW_IMPLEMENTATION_PLAN.md` (completed)
- `CONTENT_GENERATION_STRATEGY.md` (completed)
- `CONTENT_QUICKSTART_CHECKLIST.md` (completed)
- `STACK_ANALYSIS.md` (historical)
- `stack.md` (duplicate)

**Total**: ~40 files to archive

#### 1.3 Root-Level Documentation
**Action**: Move to `.cursor/Documents/` or archive

**Files to Move**:
- `IMPLEMENTATION_SUMMARY.md` → `.cursor/Documents/archive/`
- `LEARNING_ACTIVITIES_IMPLEMENTATION.md` → `.cursor/Documents/` (keep active)
- `STUDENT_LEARNING_ACTIVITIES_IMPLEMENTATION.md` → `.cursor/Documents/` (keep active)
- `TROUBLESHOOTING_LEARNING_ACTIVITIES.md` → `.cursor/Documents/` (keep active)
- `AVAILABILITY_SYSTEM_CHANGES.md` → `.cursor/Documents/archive/`
- `WEBHOOK_IMPLEMENTATION_SUMMARY.md` → `.cursor/Documents/archive/`
- `WEBHOOK_ARCHITECTURE_ANALYSIS.md` → `.cursor/Documents/archive/`
- `WEBHOOKS_SETUP.md` → `.cursor/Documents/` (keep if still relevant)
- `README_GOOGLE_ANALYTICS.md` → `.cursor/Documents/` (keep active)
- `about.md` → Check if used, otherwise delete or move to docs

---

### Phase 2: Chat Logs & Conversation Files

#### 2.1 Archive Chat Logs
**Location**: `.cursor/Documents/archive/chats/`

**Files to Archive**:
- All files in `/chats/` folder (9 files)
  - `cursor_clarifying_questions_for_phase_1.md`
  - `cursor_developing_a_learning_management.md`
  - `cursor_discuss_new_product_type_for_coh.md`
  - `cursor_fix_mobile_view_component_overfl.md`
  - `cursor_fixing_build_error_in_admin_dash.md`
  - `cursor_improve_study_phases_and_content.md`
  - `cursor_preparing_for_phase_5_of_admin_dash.md`
  - `cursor_study_plan_not_displaying_issue.md`
  - `cursor_update_css_and_implement_dark_mo.md`

**Action**: Move entire `/chats/` folder to archive

---

### Phase 3: Data Files & Assets

#### 3.1 CSV Files
**Location**: Root and `/public/`

**Root CSV Files** (Check if used):
- `Jflashcards Vol 1.csv` - Check if imported/used
- `tutor-quiz-Examen pratique 1.csv` - Check if imported/used
- `tutor-quiz-Quiz Chapitre 1 à 3.csv` - Check if imported/used

**Public CSV Files** (Check if used):
- `public/quiz-ccvm1-36-81.csv`
- `public/quiz-ccvm1-82-100.csv`
- `public/quiz-ccvm1-examen1-3.csv`

**Action**: 
- If used for imports: Move to `/data/imports/` or `/scripts/data/`
- If unused: Delete or move to archive
- Templates should stay in `/templates/`

#### 3.2 Image Files
**Location**: `/public/`

**Keep**: All logo and UI images
**Review**: Screenshot images (`.PNG` files) - might be documentation assets

**Action**: Move documentation screenshots to `.cursor/Documents/assets/` if needed

---

### Phase 4: Code Cleanup

#### 4.1 FIN3500-platform Folder
**Status**: ⚠️ Needs Investigation

**Questions**:
- Is this an old project?
- Is it still referenced in the codebase?
- Can it be moved to a separate repository?

**Action**: 
- Check for imports/references
- If unused: Move to `/archive/fin3500-platform/` or delete
- If used: Document its purpose

#### 4.2 CSS Files
**Files**:
- `app/globals.css` - ✅ Keep (main styles)
- `global.css` (root) - ⚠️ Check if duplicate
- `newstyle.css` (root) - ⚠️ Check if used

**Action**: 
- Check imports
- Remove duplicates
- Consolidate if needed

#### 4.3 Unused Scripts
**Location**: `/scripts/`

**Review each script**:
- `cleanup-appointment-availability.ts` - Check if still needed
- `cleanup-error-logs.ts` - Check if still needed
- `test-routes.ts` - Check if still needed
- `update-internal-links.ts` - Check if still needed

**Action**: Keep maintenance scripts, remove one-time migration scripts

---

### Phase 5: Folder Structure Improvements

#### 5.1 Recommended Structure (Next.js 16 Best Practices)

```
Dojo_Financier_App/
├── .cursor/
│   ├── Documents/
│   │   ├── [Active documentation - 7-10 files]
│   │   └── archive/
│   │       ├── performance/ (old performance docs)
│   │       ├── study-plan/ (old study plan docs)
│   │       ├── routes/ (old route migration docs)
│   │       └── chats/ (old chat logs)
│   ├── rules/
│   └── MASTERPLAN.md
├── app/ (Next.js App Router)
├── components/
├── lib/
├── public/
│   ├── images/ (organized by type)
│   └── data/ (if needed for static data)
├── prisma/
├── scripts/
│   └── data/ (CSV imports if needed)
├── templates/
├── data/ (if needed for seed data)
└── [config files]
```

#### 5.2 Create Archive Structure

```
.cursor/Documents/archive/
├── performance/
│   ├── phase-1-2/
│   ├── phase-3-4/
│   └── historical/
├── study-plan/
│   ├── implementation/
│   └── algorithm/
├── routes/
│   ├── migration/
│   └── testing/
├── features/
│   ├── learning-activities/
│   ├── webhooks/
│   └── analytics/
└── chats/
```

---

## 📋 Implementation Plan

### Step 1: Create Archive Structure
1. Create `.cursor/Documents/archive/` with subfolders
2. Create `.cursor/Documents/assets/` for images

### Step 2: Archive Documentation
1. Move historical docs to appropriate archive folders
2. Keep only active/essential docs in main Documents folder

### Step 3: Archive Chat Logs
1. Move `/chats/` folder to archive

### Step 4: Organize Data Files
1. Check CSV file usage
2. Move to appropriate locations or delete
3. Organize public assets

### Step 5: Code Cleanup
1. Investigate FIN3500-platform folder
2. Check CSS file usage
3. Review and clean scripts

### Step 6: Update .gitignore
1. Add archive folder patterns if needed
2. Ensure proper exclusions

---

## ✅ Success Criteria

- [ ] Documentation reduced from 52+ to ~10 active files
- [ ] All historical docs properly archived
- [ ] Chat logs archived
- [ ] CSV files organized or removed
- [ ] FIN3500-platform folder resolved
- [ ] No duplicate CSS files
- [ ] Clean root directory
- [ ] Clear folder structure following Next.js best practices

---

## 🚨 Safety Measures

1. **Before deleting anything**:
   - Check git history
   - Search codebase for references
   - Verify files aren't imported

2. **Archive, don't delete**:
   - Move to archive first
   - Can delete later after verification

3. **Test after cleanup**:
   - Run build
   - Check for broken imports
   - Verify app still works

---

## 📝 Notes

- Keep this cleanup strategy document active
- Update as cleanup progresses
- Document any issues encountered

---

**Next Steps**: Review this strategy, then proceed with implementation phase by phase.
