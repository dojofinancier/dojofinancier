# Smart Review Implementation Plan

## Overview

Smart Review is the core feature of Phase 2 (Review & Active Recall) that presents a mixed deck of flashcards and learning activities based on spaced repetition scheduling. It adapts to user performance through self-rating and dynamically adjusts review intervals.

---

## 1. Database Schema Updates

### 1.1 Extend ReviewQueueItem Model

**Current State**: Supports `flashcardId` and `quizId` only.

**Required Changes**:
```prisma
model ReviewQueueItem {
  // ... existing fields ...
  learningActivityId String? @map("learning_activity_id") // NEW: Support learning activities
  
  // Relations
  learningActivity LearningActivity? @relation(fields: [learningActivityId], references: [id], onDelete: Cascade)
  
  // Add index for efficient querying
  @@index([learningActivityId])
}
```

**Migration**: Add `learningActivityId` column and foreign key constraint.

---

### 1.2 Add Memory Strength Tracking

**New Model or Extend Existing**:
```prisma
model TopicProgress {
  userId      String   @map("user_id")
  courseId    String   @map("course_id")
  moduleId    String   @map("module_id")
  learnStatus LearnStatus @map("learn_status") // not_started / in_progress / learned
  memoryStrength Float? @map("memory_strength") // 0.0 - 1.0 (NEW)
  errorRate   Float?   @map("error_rate") // 0.0 - 1.0 (NEW)
  lastLearnedAt DateTime? @map("last_learned_at")
  lastReviewedAt DateTime? @map("last_reviewed_at")
  
  // ... relations ...
}
```

**Note**: Check if `TopicProgress` or similar model exists. If not, create it.

---

### 1.3 Add Review Session Tracking

**New Model**:
```prisma
model ReviewSession {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  courseId      String   @map("course_id")
  startedAt     DateTime @default(now()) @map("started_at")
  completedAt   DateTime? @map("completed_at")
  itemsReviewed Int      @default(0) @map("items_reviewed")
  itemsCompleted Int     @default(0) @map("items_completed")
  averageDifficulty ReviewDifficulty? @map("average_difficulty")
  
  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  @@index([userId, courseId, startedAt])
  @@map("review_sessions")
}
```

**Purpose**: Track review sessions for analytics and "Today's Plan" integration.

---

## 2. Spaced Repetition Algorithm

### 2.1 Algorithm Selection

**Recommendation**: Implement **SM-2 (SuperMemo 2)** algorithm with modifications for exam timeline compression.

**Key Features**:
- Base interval progression: 1d → 4d → 10d → 20d → 40d → 90d
- Self-rating based: Easy (multiply by 2.5), Medium (multiply by 1.5), Hard (multiply by 1.0)
- Timeline compression based on days until exam
- Minimum interval: 1 day, Maximum interval: 90 days (or exam date)

### 2.2 Implementation Location

**File**: `lib/utils/spaced-repetition.ts`

**Functions**:
```typescript
/**
 * Calculate next review interval based on current interval and difficulty rating
 */
export function calculateNextInterval(
  currentIntervalDays: number,
  difficulty: ReviewDifficulty,
  daysUntilExam: number
): number

/**
 * Calculate memory strength based on review history
 */
export function calculateMemoryStrength(
  reviewCount: number,
  averageDifficulty: ReviewDifficulty,
  lastReviewDaysAgo: number
): number

/**
 * Determine if item is due for review
 */
export function isDueForReview(
  dueAt: Date,
  currentDate: Date = new Date()
): boolean

/**
 * Compress intervals for short timelines
 */
export function compressIntervals(
  baseIntervals: number[],
  daysUntilExam: number
): number[]
```

### 2.3 Integration with Exam Timeline

**Logic**:
- If `daysUntilExam > 60`: Use full intervals (1d, 4d, 10d, 20d, 40d, 90d)
- If `daysUntilExam 30-60`: Compress to (1d, 2d, 4d, 8d, 15d, 30d)
- If `daysUntilExam < 30`: Aggressive compression (1d, 2d, 3d, 5d, 10d, 20d)

**Implementation**: Modify interval calculation in `calculateNextInterval()`.

---

## 3. Server Actions

### 3.1 Review Queue Management

**File**: `app/actions/smart-review.ts` (NEW)

**Actions**:

#### 3.1.1 Get Due Review Items
```typescript
export async function getDueReviewItemsAction(
  courseId: string,
  options?: {
    limit?: number;
    moduleId?: string;
    activityType?: LearningActivityType;
    includeFlashcards?: boolean;
    includeActivities?: boolean;
  }
): Promise<PaginatedResult<ReviewQueueItem>>
```

**Logic**:
- Query `ReviewQueueItem` where `dueAt <= now()`
- Filter by `courseId` and optional filters
- Include related `Flashcard`, `LearningActivity`, or `Quiz` data
- Order by `dueAt` (oldest first), then by `reviewCount` (least reviewed first)
- Limit results (default: 20 items per session)

#### 3.1.2 Start Review Session
```typescript
export async function startReviewSessionAction(
  courseId: string,
  filters?: ReviewFilters
): Promise<{ success: boolean; data?: { sessionId: string; items: ReviewQueueItem[] } }>
```

**Logic**:
- Create `ReviewSession` record
- Fetch due items using `getDueReviewItemsAction`
- Return session ID and items for client-side tracking

#### 3.1.3 Complete Review Item
```typescript
export async function completeReviewItemAction(
  itemId: string,
  difficulty: ReviewDifficulty,
  sessionId?: string
): Promise<{ success: boolean }>
```

**Logic**:
- Update `ReviewQueueItem`:
  - `lastReviewedAt = now()`
  - `reviewCount += 1`
  - `difficultyLastTime = difficulty`
  - Calculate `nextIntervalDays` using spaced repetition algorithm
  - `dueAt = now() + nextIntervalDays`
- Update `ReviewSession.itemsCompleted` if `sessionId` provided
- Update `TopicProgress.memoryStrength` if applicable

#### 3.1.4 Add Items to Review Queue
```typescript
export async function addToReviewQueueAction(
  courseId: string,
  items: Array<{
    type: 'flashcard' | 'activity' | 'quiz';
    id: string;
    moduleId?: string;
  }>
): Promise<{ success: boolean }>
```

**Use Cases**:
- When module marked as "learned" (Phase 1 completion)
- When mistakes identified in Phase 3 (Practice)
- Manual addition by user

#### 3.1.5 Get Review Statistics
```typescript
export async function getReviewStatisticsAction(
  courseId: string
): Promise<{
  success: boolean;
  data?: {
    dueCount: number;
    overdueCount: number;
    upcomingCount: number;
    averageMemoryStrength: number;
    itemsByModule: Array<{ moduleId: string; count: number }>;
  };
}>
```

---

### 3.2 Learning Activity Completion

**File**: `app/actions/learning-activities.ts` (may need updates)

**New Action**:
```typescript
export async function completeLearningActivityAction(
  activityId: string,
  answers: Json,
  selfRating: ReviewDifficulty,
  sessionId?: string
): Promise<{ success: boolean; data?: { score?: number; isCorrect?: boolean } }>
```

**Logic**:
- Create `LearningActivityAttempt` record
- Auto-grade if applicable (compare with `correctAnswers`)
- If activity is in review queue, call `completeReviewItemAction`
- Update `TopicProgress` if applicable

---

## 4. Client Components

### 4.1 Smart Review Session Component

**File**: `components/course/smart-review-session.tsx` (NEW)

**Features**:
- Displays mixed deck of flashcards and activities
- Progress indicator (X of Y items)
- Self-rating buttons (Easy / Medium / Hard) after each item
- Navigation: Previous / Next / Skip
- Session summary on completion

**Props**:
```typescript
interface SmartReviewSessionProps {
  courseId: string;
  initialItems: ReviewQueueItem[];
  sessionId: string;
  onComplete: (stats: ReviewSessionStats) => void;
  onExit: () => void;
}
```

**State Management**:
- Current item index
- Completed items (for summary)
- Session start time
- Items with their difficulty ratings

**UI Flow**:
1. Show item (flashcard or activity)
2. User interacts (flip card, complete activity)
3. Show self-rating buttons
4. On rating: submit, move to next item
5. On last item: show summary, call `onComplete`

---

### 4.2 Smart Review Dashboard

**File**: `components/course/smart-review-dashboard.tsx` (NEW)

**Features**:
- "Start Smart Review" button (main CTA)
- Review statistics (due count, overdue, upcoming)
- Filters:
  - By module (dropdown)
  - By activity type (checkboxes)
  - By tag (weak topics, recent errors, etc.)
- Quick stats cards (memory strength, items reviewed today)

**Integration**:
- Uses `getReviewStatisticsAction` for stats
- Uses `startReviewSessionAction` to begin session
- Passes filters to session component

---

### 4.3 Update Phase2Review Component

**File**: `components/course/phase2-review.tsx` (UPDATE)

**Changes**:
- Replace placeholder "Smart Review" tab content with `SmartReviewDashboard`
- Integrate with existing flashcards and activities tabs
- Add navigation between tabs

**Structure**:
```tsx
<TabsContent value="smart-review">
  <SmartReviewDashboard 
    courseId={courseId}
    course={course}
    settings={settings}
  />
</TabsContent>
```

---

### 4.4 Learning Activity Review Components

**File**: `components/course/learning-activity-review.tsx` (NEW)

**Purpose**: Render learning activities in review context (not full activity page).

**Features**:
- Compact view for review session
- Self-rating integration
- Support all 8 activity types:
  1. Short-answer
  2. Fill-in-the-blank
  3. Sorting/Ranking
  4. Classification
  5. Numeric entry
  6. Table completion
  7. Error-spotting
  8. Deep dive (show previous attempts/feedback)

**Note**: Reuse existing activity components but in "review mode".

---

## 5. Integration with Today's Plan

### 5.1 Update Study Plan Generator

**File**: `lib/utils/study-plan.ts` (UPDATE)

**Add Function**:
```typescript
export function generateReviewTasks(
  courseId: string,
  userId: string,
  date: Date,
  blocksAvailable: number
): Promise<StudyBlock[]>
```

**Logic**:
- Query due review items for the date
- Estimate blocks needed (1 block ≈ 15-20 items)
- Create `StudyBlock` entries with `taskType: 'REVIEW'`
- Include `targetFlashcardIds` or `targetActivityIds`

### 5.2 Update TodaysPlan Component

**File**: `components/course/todays-plan.tsx` (UPDATE)

**Changes**:
- Display review tasks with item count
- "Start Review" button links to Smart Review with pre-filtered items
- Show progress: "X of Y items reviewed today"

---

## 6. Integration with Phase 3 (Practice)

### 6.1 Add Mistakes to Review Queue

**File**: `app/actions/practice.ts` or `app/actions/exams.ts` (UPDATE)

**New Function**:
```typescript
export async function addMistakesToReviewQueueAction(
  courseId: string,
  assessmentId: string,
  incorrectQuestionIds: string[]
): Promise<{ success: boolean }>
```

**Logic**:
- For each incorrect question:
  - Find related flashcard or create review queue item for question
  - Set `dueAt = now()` (immediate review)
  - Tag with "recent_error" for filtering

**Integration Point**:
- After quiz/exam completion, show "Add mistakes to review" button
- Call this action when user clicks

---

## 7. Admin Interface

### 7.1 Learning Activity Creation

**File**: `components/admin/learning-activities/learning-activity-form.tsx` (may exist, UPDATE)

**Requirements**:
- Support all 8 activity types with type-specific fields
- Tag activities by module/chapter
- Set correct answers for auto-grading
- Set tolerance for numeric activities

### 7.2 Review Queue Management (Admin)

**File**: `components/admin/review-queue-management.tsx` (NEW, optional)

**Features**:
- View all review queue items (admin only)
- Manually add items to queue
- Adjust intervals manually
- View review statistics per user

---

## 8. UI/UX Enhancements

### 8.1 Review Session Experience

**Design Principles**:
- **Minimal distractions**: Full-screen or focused card view
- **Clear progress**: "Item 5 of 20" indicator
- **Quick actions**: Large, accessible rating buttons
- **Smooth transitions**: Animate between items
- **Motivation**: Show streaks, completion percentage

**Components Needed**:
- `ReviewItemCard` - Wrapper for flashcard/activity in review
- `SelfRatingButtons` - Easy/Medium/Hard buttons
- `ReviewProgressBar` - Visual progress indicator
- `ReviewSessionSummary` - Completion screen with stats

### 8.2 Filtering UI

**Components**:
- `ReviewFilters` - Module dropdown, activity type checkboxes, tag filters
- `ReviewStatsCards` - Due count, overdue, memory strength

---

## 9. Performance Considerations

### 9.1 Query Optimization

- Index `ReviewQueueItem` on `(userId, courseId, dueAt)`
- Batch load related data (flashcards, activities) in single query
- Use pagination for large review queues

### 9.2 Caching Strategy

- Cache review statistics (5-minute TTL)
- Cache due items count (1-minute TTL)
- Invalidate on review completion

### 9.3 Client-Side Optimization

- Preload next item while user reviews current
- Lazy load activity components
- Debounce self-rating submissions

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Spaced repetition algorithm calculations
- Interval compression logic
- Memory strength calculations

### 10.2 Integration Tests

- Review queue creation from Phase 1 completion
- Review item completion and interval updates
- Integration with Today's Plan

### 10.3 E2E Tests

- Complete review session flow
- Filter application
- Mistake addition from Phase 3

---

## 11. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. ✅ Database schema updates (ReviewQueueItem, ReviewSession)
2. ✅ Spaced repetition algorithm implementation
3. ✅ Server actions for review queue management
4. ✅ Basic Smart Review session component

### Phase 2: UI/UX (Week 2)
1. ✅ Smart Review dashboard with filters
2. ✅ Review session experience (progress, ratings)
3. ✅ Integration with Phase2Review component
4. ✅ Learning activity review components

### Phase 3: Integration (Week 3)
1. ✅ Today's Plan integration
2. ✅ Phase 3 (Practice) mistake integration
3. ✅ Review statistics and analytics
4. ✅ Admin interface updates

### Phase 4: Polish & Optimization (Week 4)
1. ✅ Performance optimization
2. ✅ UI/UX refinements
3. ✅ Testing and bug fixes
4. ✅ Documentation

---

## 12. Data Migration

### 12.1 Existing Data

**If users already have flashcards/activities**:
- Create initial review queue items for all existing flashcards
- Set `dueAt = now()` for immediate availability
- Set `nextIntervalDays = 1` (first review)

**Migration Script**: `scripts/initialize-review-queues.ts`

---

## 13. Configuration & Tuning

### 13.1 Algorithm Parameters

**Configurable via environment or database**:
- Base intervals array
- Difficulty multipliers (Easy, Medium, Hard)
- Compression thresholds (days until exam)
- Minimum/maximum intervals

**File**: `lib/config/spaced-repetition-config.ts`

---

## 14. Analytics & Tracking

### 14.1 Metrics to Track

- Review session completion rate
- Average items per session
- Self-rating distribution (Easy/Medium/Hard)
- Memory strength trends
- Items reviewed per day/week
- Overdue items count

### 14.2 Google Analytics Events

- `review_session_started`
- `review_item_completed`
- `review_session_completed`
- `review_item_rated` (with difficulty)

---

## 15. Future Enhancements

### 15.1 Advanced Features (Post-MVP)

- **Adaptive difficulty**: Adjust based on user performance patterns
- **Collaborative review**: Study groups with shared decks
- **Voice input**: For short-answer activities
- **Image recognition**: For classification activities
- **AI-powered hints**: For struggling items
- **Review reminders**: Email/push notifications

### 15.2 Research Integration

- A/B testing different algorithms (SM-2 vs. FSRS)
- Optimal session length experiments
- Best time of day for reviews

---

## 16. Dependencies

### 16.1 Existing Components to Reuse

- `FlashcardComponent` - For flashcard display
- `LearningActivitiesList` - For activity listing (adapt for review)
- Activity type components (short-answer, fill-in-blank, etc.)

### 16.2 New Dependencies

- None required (use existing React/Next.js/Prisma stack)

---

## 17. Risk Mitigation

### 17.1 Potential Issues

1. **Performance with large queues**: Implement pagination and efficient queries
2. **Complex activity rendering**: Reuse existing components, add "review mode"
3. **Algorithm tuning**: Make parameters configurable, allow A/B testing
4. **User adoption**: Clear onboarding, show value (memory strength, progress)

### 17.2 Rollback Plan

- Keep existing flashcard/activity tools functional
- Smart Review is additive, not replacement
- Can disable via feature flag if needed

---

## 18. Success Metrics

### 18.1 User Engagement

- % of users who complete at least one review session
- Average review sessions per week per user
- Review session completion rate

### 18.2 Learning Outcomes

- Improvement in memory strength over time
- Reduction in error rate on repeated items
- Correlation between review frequency and exam performance

---

## Summary

Smart Review is a comprehensive spaced repetition system that:
1. **Presents mixed decks** of flashcards and activities based on due dates
2. **Adapts intervals** based on self-rating and exam timeline
3. **Integrates seamlessly** with Phase 1 (Learn) and Phase 3 (Practice)
4. **Provides clear UX** with progress tracking and statistics
5. **Scales efficiently** with proper indexing and caching

The implementation is modular and can be built incrementally, starting with core infrastructure and expanding to full UI/UX and integrations.

