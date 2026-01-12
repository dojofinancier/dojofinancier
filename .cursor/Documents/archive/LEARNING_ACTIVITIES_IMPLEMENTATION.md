# Learning Activities & Phase Organization Implementation

## Overview

This document describes the implementation of improved study phases with clear content management for each phase, including 8 types of learning activities for Phase 2.

## What Was Implemented

### 1. Database Schema Updates (`prisma/schema.prisma`)

#### New Models:
- **LearningActivity**: Stores learning activities with 8 different types
  - Activity types: SHORT_ANSWER, FILL_IN_BLANK, SORTING_RANKING, CLASSIFICATION, NUMERIC_ENTRY, TABLE_COMPLETION, ERROR_SPOTTING, DEEP_DIVE
  - Tagged by module/chapter
  - Stores activity-specific content as JSON
  - Supports correct answers and tolerance for numeric activities

- **LearningActivityAttempt**: Tracks student attempts at activities
  - Stores answers as JSON
  - Supports auto-grading and instructor feedback (for deep dives)

- **QuestionBank**: Large pools of MCQ questions for Phase 3
  - Tagged by chapter/module
  - Questions served randomly to students

- **QuestionBankQuestion**: Individual questions in question banks

#### Updated Models:
- **ContentItem**: Added `studyPhase` field to organize content by phase (PHASE_1_LEARN, PHASE_2_REVIEW, PHASE_3_PRACTICE)
- **ContentType**: Added `LEARNING_ACTIVITY` enum value
- **Module**: Added relations for learning activities and question banks
- **Course**: Added relation for question banks
- **User**: Added relation for learning activity attempts

### 2. Server Actions (`app/actions/learning-activities.ts`)

Created comprehensive CRUD operations:
- `getLearningActivitiesAction`: Fetch activities (optionally filtered by module)
- `createLearningActivityAction`: Create new activities
- `updateLearningActivityAction`: Update existing activities
- `deleteLearningActivityAction`: Delete activities

### 3. Admin UI Component (`components/admin/courses/learning-activity-manager.tsx`)

Full-featured management interface with:
- List view of all learning activities
- Create/Edit dialog with activity type selector
- Activity-specific form fields for each of the 8 types:
  1. **Short-answer**: Question + acceptable answers (2-3)
  2. **Fill-in-the-blank**: Text with blanks + correct answers
  3. **Sorting/Ranking**: Items to order + correct order
  4. **Classification**: Categories + items to classify
  5. **Numeric entry**: Question + correct answer + tolerance
  6. **Table completion**: JSON table structure + correct answers
  7. **Error-spotting**: Incorrect solution + question + correct answer
  8. **Deep dive**: Topic + research questions (not auto-graded)
- Module/chapter tagging
- Activity type badges
- Delete confirmation

### 4. Course Detail Page Updates

Added new "Activités d'apprentissage" tab between "Flashcards" and "Examens" tabs in:
- `app/(dashboard)/dashboard/admin/courses/[courseId]/page.tsx`

### 5. Documentation Updates

Updated `.cursor/COURSE_UX.md` to reflect:
- Phase 1 content requirements: Videos, Notes, 10-12 MCQs
- Phase 2 content requirements: Flashcards, Learning Activities (8 types)
- Phase 3 content requirements: Mock Exams, MCQ Question Banks
- Detailed descriptions of each learning activity type
- Content management workflow for admins

## Phase Structure Summary

### Phase 1 - Learn the Material
**Content:**
- Videos (Vimeo links)
- Notes
- 10-12 MCQs per module

**Management:**
- Videos and notes managed in "Modules et contenu" tab
- Quizzes created in module management

### Phase 2 - Review & Active Recall
**Content:**
- Flashcards (tagged by chapter)
- Learning Activities (8 types, tagged by chapter)

**Management:**
- Flashcards: "Flashcards" tab
- Learning Activities: "Activités d'apprentissage" tab (NEW)

### Phase 3 - Practice & Exam Simulation
**Content:**
- Mock Exams (timed, full-length)
- MCQ Question Banks (large pools, tagged by chapter, served randomly)

**Management:**
- Mock Exams: "Examens" tab
- Question Banks: (To be implemented - schema ready)

## Next Steps

### 1. Database Migration
Run Prisma migration to apply schema changes:
```bash
npx prisma migrate dev --name add_learning_activities_and_phases
```

Or if using Supabase migrations:
```bash
npx prisma db push
```

### 2. Regenerate Prisma Client
After migration:
```bash
npx prisma generate
```

### 3. Implement Question Bank Management
Create similar components for QuestionBank management:
- `components/admin/courses/question-bank-manager.tsx`
- `app/actions/question-banks.ts`
- Add tab to course detail page

### 4. Student-Facing Implementation
Implement student views for:
- Phase 1: Video/Notes/Quiz interface
- Phase 2: Learning activity player with appropriate UI for each type
- Phase 3: Question bank randomizer and mock exam interface

### 5. Activity Type UI Components
Create student-facing components for each activity type:
- ShortAnswerActivity
- FillInBlankActivity
- SortingActivity
- ClassificationActivity
- NumericEntryActivity
- TableCompletionActivity
- ErrorSpottingActivity
- DeepDiveActivity

### 6. Grading Logic
Implement auto-grading for:
- Short-answer (normalize case/whitespace/accents)
- Fill-in-the-blank
- Sorting/Ranking
- Classification
- Numeric entry (with tolerance)
- Table completion
- Error-spotting

Deep dives should be sent to instructor for manual review.

## Activity Type Details

### 1. Short-Answer
- Student types word/number/short phrase
- Store 2-3 acceptable answers
- Normalize: case, whitespace, accents
- Example: "What is the formula for FV of an ordinary annuity?"

### 2. Fill-in-the-Blank
- Sentence/formula with blanks (use `___`)
- One or more blanks
- Store correct answers per blank
- Example: "The guarantee is usually ___% at maturity"

### 3. Sorting/Ranking
- Drag-and-drop ordering
- Store correct order
- Example: Order products by volatility (low to high)

### 4. Classification
- Sort items into 2-4 categories
- Drag-and-drop into buckets
- Example: Registered vs Non-registered accounts

### 5. Numeric Entry
- Calculation problem
- Answer is a number
- Tolerance: ±0.01 (absolute) or ±1% (relative)
- Example: "Compute investment value after 5 years"

### 6. Table Completion
- Partial table with missing cells
- Fill in missing values
- Store correct answers as JSON (rowIndex_cellIndex: answer)

### 7. Error-Spotting
- Show worked solution with mistakes
- Student identifies error
- Store description of correct error identification

### 8. Deep Dive
- Research questions (not auto-graded)
- Sent to instructor for review
- Examples: "List pros/cons", "History/evolution", "Real-life examples"

## Technical Notes

- All activity content stored as JSON for flexibility
- Module/chapter tagging allows filtering and organization
- Activities automatically assigned to Phase 2 (PHASE_2_REVIEW)
- Content items can now have `studyPhase` field for organization
- Learning activities linked to ContentItem for consistency with existing content model

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Create learning activity of each type
- [ ] Edit existing activities
- [ ] Delete activities
- [ ] Filter activities by module
- [ ] Verify content is saved correctly in JSON format
- [ ] Test form validation for each activity type
- [ ] Verify module tagging works correctly


