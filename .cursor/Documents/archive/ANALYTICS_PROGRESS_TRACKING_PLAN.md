# Analytics & Progress Tracking Implementation Plan

## Current State Analysis

### ✅ Data Currently Being Tracked

#### 1. **Progress Tracking** (`ProgressTracking`)
- Time spent per content item (seconds)
- Completion status (`completedAt`)
- Last accessed timestamps
- Per content item (video, note, quiz, etc.)

#### 2. **Module Progress** (`ModuleProgress`)
- Learn status (NOT_STARTED, IN_PROGRESS, LEARNED)
- Last learned date
- Last reviewed date
- Memory strength (0-1 scale)
- Error rate (0-1 scale)
- Difficulty estimate (0-1 scale)

#### 3. **Quiz Attempts** (`QuizAttempt`)
- Score (percentage)
- Answers (JSON)
- Completion time
- Time spent (seconds)

#### 4. **Learning Activity Attempts** (`LearningActivityAttempt`)
- Answers (JSON)
- Score (for auto-graded)
- Grading status
- Instructor feedback
- Time spent (seconds)

#### 5. **Question Bank Attempts** (`QuestionBankAttempt`)
- Individual question answers
- Correctness (isCorrect)
- Time spent (seconds)

#### 6. **Flashcard Study Sessions** (`FlashcardStudySession`)
- Difficulty rating (EASY, DIFFICULT)
- Study timestamp

#### 7. **Review Sessions** (`ReviewSession`)
- Items reviewed count
- Items completed count
- Average difficulty
- Start/completion times

#### 8. **Assessment Results** (`AssessmentResult`)
- Assessment type (MINI_CHECK, DRILL, MOCK_EXAM, TOPIC_QUIZ)
- Score
- Passing score
- Answers (JSON)

#### 9. **Daily Plan Entries** (`DailyPlanEntry`)
- Task type (LEARN, REVIEW, PRACTICE)
- Status (PENDING, IN_PROGRESS, COMPLETED)
- Estimated blocks
- Actual time spent (seconds)
- Completion date

#### 10. **Review Queue Items** (`ReviewQueueItem`)
- Due date
- Difficulty last time (EASY, MEDIUM, HARD)
- Review count
- Last reviewed date
- Next interval (days)

### ✅ Existing Analytics (Admin Only)

#### Current Admin Analytics Dashboard
- Enrollment statistics (total, active, expired)
- Enrollments by course
- Completion rates by course
- User engagement (active users, time spent)
- Course-level metrics

### ❌ Missing Analytics

#### Student-Facing:
- Personal progress dashboard
- Course completion overview
- Study time analytics
- Performance trends
- Weak areas identification
- Study streak tracking
- Goal progress tracking

#### Admin-Facing:
- Student-level usage patterns
- Feature usage analytics
- Content engagement heatmaps
- Drop-off points analysis
- Study plan adherence
- Phase completion rates
- Review session effectiveness

---

## Implementation Plan

### Phase 1: Student Analytics Dashboard

#### 1.1 Overview Section
**Location**: `/tableau-de-bord/etudiant` (new "Analytics" tab)

**Metrics to Display:**
- **Total Study Time**: Sum of all `timeSpent` from `ProgressTracking`, `DailyPlanEntry`, `QuizAttempt`, etc.
- **Active Courses**: Count of active enrollments
- **Completion Rate**: Percentage of enrolled courses completed
- **Current Streak**: Consecutive days with study activity
- **Longest Streak**: Best streak achieved
- **Study Days This Week**: Days with study activity
- **Blocks Completed**: From `DailyPlanEntry` (COMPLETED status)

#### 1.2 Course Progress Section
**Per Course View:**
- **Progress Bar**: Modules learned / total modules
- **Time Spent**: Total time in course
- **Completion Status**: 
  - Phase 1: Modules learned / total
  - Phase 2: Review sessions completed
  - Phase 3: Mock exams completed
- **Last Activity**: Most recent study activity date
- **Upcoming Tasks**: Next due items from study plan

#### 1.3 Performance Analytics
**Charts & Visualizations:**
- **Quiz Score Trends**: Line chart showing quiz scores over time
- **Module Performance**: Bar chart showing performance per module
  - Average quiz scores
  - Completion rate
  - Time spent
- **Weak Areas**: Modules with:
  - Low quiz scores (< 70%)
  - High error rates
  - Low completion rates
- **Review Effectiveness**: 
  - Flashcard mastery rate
  - Review session completion rate
  - Difficulty distribution over time

#### 1.4 Study Habits
**Time-Based Analytics:**
- **Study Time by Day of Week**: Bar chart
- **Study Time by Hour**: Heatmap
- **Daily Study Time**: Line chart (last 30 days)
- **Weekly Study Time**: Comparison to recommended hours
- **Study Plan Adherence**: 
  - Tasks completed on time
  - Tasks completed late
  - Tasks skipped

#### 1.5 Goals & Achievements
**Progress Tracking:**
- **Study Plan Goals**: 
  - Blocks completed / total blocks
  - Days until exam
  - On track indicator
- **Milestones**:
  - First module completed
  - First quiz passed
  - First review session
  - Course completion
- **Achievements Badges**:
  - Consistent learner (7-day streak)
  - Dedicated student (30-day streak)
  - Quiz master (all quizzes > 80%)
  - Review champion (100 review sessions)

---

### Phase 2: Enhanced Admin Analytics

#### 2.1 Student Usage Patterns
**Individual Student Analytics:**
- **Activity Timeline**: When students are most active
- **Feature Usage**:
  - Videos watched
  - Quizzes taken
  - Flashcards studied
  - Learning activities completed
  - Review sessions started
  - Study plan tasks completed
- **Engagement Score**: Composite metric based on:
  - Login frequency
  - Study time
  - Content completion
  - Quiz performance
- **Drop-off Analysis**: 
  - Where students stop (module, content item)
  - Time to drop-off
  - Common drop-off points

#### 2.2 Content Engagement Analytics
**Content-Level Insights:**
- **Most Engaged Content**: 
  - Videos with most views
  - Quizzes with most attempts
  - Flashcards with most reviews
  - Activities with most completions
- **Least Engaged Content**: 
  - Content with low completion rates
  - Content with high drop-off
- **Content Effectiveness**:
  - Correlation between content engagement and quiz scores
  - Time spent vs. performance
- **Engagement Heatmap**: 
  - Module-level engagement
  - Week-by-week engagement patterns

#### 2.3 Study Plan Analytics
**Plan Effectiveness:**
- **Plan Adherence Rate**: % of students following their plan
- **Phase Completion Rates**:
  - Phase 1: % completing all modules
  - Phase 2: % completing review sessions
  - Phase 3: % completing mock exams
- **Plan vs. Actual**:
  - Estimated vs. actual time spent
  - Scheduled vs. completed tasks
- **Plan Success Factors**:
  - What makes students stick to plans?
  - Optimal study hours per week
  - Best study day patterns

#### 2.4 Performance Analytics
**Student Performance Insights:**
- **Score Distributions**: 
  - Quiz scores by course
  - Quiz scores by module
  - Mock exam scores
- **Improvement Trends**: 
  - Score improvement over time
  - Module-to-module improvement
- **Struggling Students**: 
  - Students with consistently low scores
  - Students with declining performance
  - Students at risk of failing

#### 2.5 Feature Usage Analytics
**Feature Adoption:**
- **Feature Usage Rates**:
  - % using Smart Review
  - % using Study Plan
  - % using Flashcards
  - % using Learning Activities
- **Feature Effectiveness**:
  - Impact on performance
  - Impact on completion rates
  - User satisfaction (if tracked)
- **Feature Gaps**:
  - Features not being used
  - Features with low engagement
  - Potential improvements

#### 2.6 Cohort Analytics (for Cohort Products)
- **Cohort Engagement**: 
  - Message board participation
  - Group coaching attendance
  - Cohort completion rates
- **Instructor Effectiveness**:
  - Student performance by instructor
  - Engagement by instructor

---

### Phase 3: Database Enhancements

#### 3.1 New Tables/Fields (if needed)

**User Study Session** (optional - for better tracking):
```prisma
model UserStudySession {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  courseId    String?  @map("course_id")
  startedAt   DateTime @default(now()) @map("started_at")
  endedAt     DateTime? @map("ended_at")
  activityType String  @map("activity_type") // VIDEO, QUIZ, FLASHCARD, REVIEW, etc.
  contentItemId String? @map("content_item_id")
  duration    Int?     // seconds
}
```

**Study Streak** (optional - for streak tracking):
```prisma
model StudyStreak {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  currentStreak   Int      @default(0) @map("current_streak")
  longestStreak   Int      @default(0) @map("longest_streak")
  lastStudyDate   DateTime @map("last_study_date")
  streakStartDate DateTime @map("streak_start_date")
}
```

**Note**: These can be calculated on-the-fly from existing data, but caching might improve performance.

#### 3.2 Indexes for Performance
- Add indexes on frequently queried fields:
  - `ProgressTracking(userId, completedAt)`
  - `DailyPlanEntry(userId, date, status)`
  - `QuizAttempt(userId, completedAt)`
  - `ReviewSession(userId, startedAt)`

---

### Phase 4: Implementation Details

#### 4.1 Server Actions

**Student Analytics Actions** (`app/actions/student-analytics.ts`):
```typescript
- getStudentOverviewAction(userId, courseId?)
- getStudentProgressAction(userId, courseId)
- getStudentPerformanceAction(userId, courseId)
- getStudentStudyHabitsAction(userId, courseId?)
- getStudentGoalsAction(userId, courseId)
- getStudentAchievementsAction(userId)
```

**Enhanced Admin Analytics Actions** (`app/actions/admin-analytics.ts`):
```typescript
- getStudentUsagePatternsAction(studentId?, courseId?)
- getContentEngagementAction(courseId)
- getStudyPlanAnalyticsAction(courseId)
- getFeatureUsageAction(courseId?)
- getPerformanceInsightsAction(courseId)
- getDropOffAnalysisAction(courseId)
```

#### 4.2 Client Components

**Student Dashboard Components**:
- `components/student-analytics/overview-section.tsx`
- `components/student-analytics/course-progress-section.tsx`
- `components/student-analytics/performance-charts.tsx`
- `components/student-analytics/study-habits-charts.tsx`
- `components/student-analytics/goals-section.tsx`
- `components/student-analytics/achievements-section.tsx`

**Admin Dashboard Components**:
- `components/admin-analytics/student-usage-patterns.tsx`
- `components/admin-analytics/content-engagement-heatmap.tsx`
- `components/admin-analytics/study-plan-analytics.tsx`
- `components/admin-analytics/feature-usage-charts.tsx`
- `components/admin-analytics/performance-insights.tsx`
- `components/admin-analytics/drop-off-analysis.tsx`

#### 4.3 Charts Library
- Use **Recharts** (already in use) for:
  - Line charts (trends)
  - Bar charts (comparisons)
  - Pie charts (distributions)
  - Heatmaps (time-based patterns)
  - Area charts (cumulative progress)

---

### Phase 5: UI/UX Design

#### 5.1 Student Analytics Dashboard Layout

**Tab Structure** (within Student Dashboard):
```
Tableau de bord
├── Formations (existing)
├── Cohortes (existing)
├── Analytics (NEW)
│   ├── Overview
│   ├── Progression par cours
│   ├── Performance
│   ├── Habitudes d'étude
│   └── Objectifs
├── Profil (existing)
├── Rendez-vous (existing)
└── Support (existing)
```

**Overview Tab**:
- Summary cards (4-6 cards)
- Quick stats
- Recent activity feed
- Upcoming tasks

**Per-Course View**:
- Course selector dropdown
- Detailed metrics for selected course
- Progress visualization
- Performance breakdown

#### 5.2 Admin Analytics Dashboard Layout

**New Sections** (within Admin Analytics):
```
Analytics
├── Vue d'ensemble (existing)
├── Utilisation des étudiants (NEW)
│   ├── Patterns d'activité
│   ├── Engagement par fonctionnalité
│   └── Analyse de décrochage
├── Engagement du contenu (NEW)
│   ├── Heatmap d'engagement
│   ├── Contenu le plus/moins utilisé
│   └── Efficacité du contenu
├── Analytics du plan d'étude (NEW)
│   ├── Taux d'adhésion
│   ├── Taux de complétion par phase
│   └── Facteurs de succès
└── Performance (NEW)
    ├── Distributions de scores
    ├── Tendances d'amélioration
    └── Étudiants à risque
```

---

### Phase 6: Data Aggregation & Caching

#### 6.1 Real-time vs. Cached Data
- **Real-time**: Current progress, recent activity
- **Cached** (5-15 min): Aggregated stats, trends
- **Daily Aggregation**: Historical trends, streaks

#### 6.2 Performance Optimization
- Use `unstable_cache` for expensive queries
- Batch queries where possible
- Paginate large datasets
- Use database views for complex aggregations (optional)

---

## Implementation Priority

### High Priority (MVP)
1. ✅ Student Overview Section (summary cards)
2. ✅ Course Progress Section (per course)
3. ✅ Basic Performance Charts (quiz scores, module completion)
4. ✅ Admin Student Usage Patterns
5. ✅ Admin Content Engagement (basic)

### Medium Priority
6. Study Habits Analytics
7. Goals & Achievements
8. Admin Study Plan Analytics
9. Admin Feature Usage Analytics
10. Drop-off Analysis

### Low Priority (Nice to Have)
11. Advanced visualizations (heatmaps, advanced charts)
12. Predictive analytics (at-risk students)
13. Comparative analytics (student vs. cohort)
14. Export functionality (PDF reports)

---

## Success Metrics

### For Students:
- **Engagement**: Increased time on platform
- **Completion**: Higher course completion rates
- **Retention**: Students checking analytics regularly
- **Motivation**: Students using goals/achievements

### For Admins:
- **Insights**: Ability to identify struggling students
- **Content Optimization**: Data to improve content
- **Feature Development**: Understanding which features to prioritize
- **Student Success**: Ability to intervene early

---

## Next Steps

1. **Review & Approve Plan**: Confirm priorities and scope
2. **Design Mockups**: Create UI mockups for key sections
3. **Implement Server Actions**: Start with high-priority actions
4. **Build Components**: Create reusable chart components
5. **Integrate**: Add analytics tab to student dashboard
6. **Test**: Test with real data
7. **Iterate**: Refine based on usage

---

## Questions for Clarification

1. **Streak Definition**: What constitutes a "study day"? Any activity? Minimum time?
2. **Goals**: Should students be able to set custom goals, or only use study plan goals?
3. **Privacy**: Should students see cohort averages, or only their own data?
4. **Admin Access**: Should admins see individual student data, or only aggregated?
5. **Export**: Do we need PDF/CSV export functionality?
6. **Real-time Updates**: How frequently should data refresh?

