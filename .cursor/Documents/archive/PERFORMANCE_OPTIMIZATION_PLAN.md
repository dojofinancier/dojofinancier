# Performance Optimization Plan - Le Dojo Financier

**Date**: December 2024  
**Status**: Comprehensive Review & Action Plan

## Executive Summary

After reviewing Phase 11.7 and conducting a thorough codebase audit, I've identified **critical performance bottlenecks** that are significantly impacting platform speed. The current implementation has several N+1 query problems, missing database indexes, inefficient data fetching patterns, and unnecessary component re-renders.

**Current State**: 
- Learning Activities: ~2 queries, 200-500ms (✅ Optimized)
- Syllabus: N+1 queries (1 + N modules), 2-5+ seconds
- Module Content: Multiple nested includes, 500ms-1s per module
- Question Bank: 3-4 sequential queries, 500ms-1s
- Overall page loads: 2-5+ seconds

**Target State**:
- All pages: <500ms initial load
- Database queries: <10 queries per page load
- Component re-renders: Minimized with proper memoization
- Data transfer: Reduced payload sizes

---

## Critical Issues Identified

### 1. **Syllabus Component - N+1 Query Problem** 🔴 CRITICAL
**Location**: `components/course/syllabus.tsx`

**Problem**:
```typescript
// Sequential loading in a loop - N+1 queries!
for (const module of modulesData) {
  const result = await getModuleContentAction(module.id); // Blocks until complete
}
```

**Impact**: 
- If 10 modules: 11 queries (1 for modules + 10 for content)
- Each query: 200-500ms
- Total: 2-5+ seconds

**Solution**: Batch load all module content in parallel

---

### 2. **Module Content Loading - Over-fetching** 🟡 HIGH
**Location**: `app/actions/module-content.ts`

**Problem**:
```typescript
include: {
  contentItems: {
    include: {
      video: true,        // Loads ALL video fields
      quiz: {
        include: {
          questions: {    // Loads ALL questions with ALL fields
            orderBy: { order: "asc" },
          },
        },
      },
      notes: { ... },
    },
  },
}
```

**Impact**:
- Fetches unnecessary data (transcripts, all quiz options, etc.)
- Large payload sizes
- Slow query execution

**Solution**: Use `select` to fetch only needed fields

---

### 3. **Question Bank - Multiple Sequential Queries** 🟡 HIGH
**Location**: `app/actions/question-bank-practice.ts`

**Problem**:
```typescript
// Query 1: Get question banks
const questionBanks = await prisma.questionBank.findMany(...);

// Query 2: Get questions
const questions = await prisma.questionBankQuestion.findMany(...);

// Query 3: Get attempts
const attempts = await prisma.questionBankAttempt.findMany(...);
```

**Impact**: 3-4 sequential queries instead of 1-2 optimized queries

**Solution**: Combine queries using SQL aggregation or single query with proper joins

---

### 4. **Videos/Notes Tools - Sequential Module Loading** 🟡 HIGH
**Location**: `components/course/tools/videos-tool.tsx`, `notes-tool.tsx`

**Problem**:
```typescript
for (const module of courseModules) {
  const result = await getModuleContentAction(module.id); // Sequential!
}
```

**Impact**: Same N+1 problem as syllabus

**Solution**: Batch load in parallel

---

### 5. **Missing Database Indexes** 🟡 MEDIUM
**Location**: `prisma/schema.prisma`

**Missing Indexes**:
- `ContentItem(moduleId, studyPhase, contentType)` - For filtering Phase 1 content
- `ContentItem(moduleId, order, contentType)` - For ordered content queries
- `Quiz(quizId, order)` - Already has unique, but could benefit from index
- `QuestionBankAttempt(userId, questionId, completedAt)` - For most recent attempt queries

**Impact**: Full table scans on large datasets

---

### 6. **Component Re-renders** 🟢 LOW-MEDIUM
**Location**: Multiple components

**Issues**:
- `learning-activities-list.tsx`: Multiple `useEffect` hooks that could trigger re-renders
- `syllabus.tsx`: No memoization of expensive computations
- Filter functions recreated on every render

**Impact**: Unnecessary re-renders slow down UI responsiveness

---

### 7. **getModulesAction - Duplicate ContentItems** 🔴 CRITICAL
**Location**: `app/actions/modules.ts:254-310`

**Problem**: The `include` for `contentItems` is duplicated **3 times** in the same query!

```typescript
include: {
  contentItems: { ... },  // First
  contentItems: { ... },  // Duplicate!
  contentItems: { ... },   // Duplicate!
}
```

**Impact**: This is a syntax error that would cause issues, but more importantly shows inefficient query structure

---

### 8. **Exam List - N+1 Query Problem** 🟡 HIGH
**Location**: `app/actions/exam-taking.ts:63-90`

**Problem**:
```typescript
const examsWithAttempts = await Promise.all(
  exams.map(async (exam) => {
    const attempts = await prisma.quizAttempt.findMany(...); // Query 1 per exam
    const attemptCount = await prisma.quizAttempt.count(...); // Query 2 per exam
  })
);
```

**Impact**: If 5 exams: 1 + (5 × 2) = 11 queries instead of 2-3 optimized queries

**Solution**: Batch load all attempts in a single query, then group by examId

---

## Optimization Plan

### Phase 1: Critical Fixes (Immediate - 1-2 days)

#### 1.1. Fix Syllabus N+1 Query Problem
**Priority**: 🔴 CRITICAL  
**Estimated Impact**: 80-90% reduction in load time (5s → 500ms)

**Implementation**:
```typescript
// Create new server action: getBatchModuleContentAction
export async function getBatchModuleContentAction(moduleIds: string[]) {
  // Single query with WHERE moduleId IN (...)
  // Use select to fetch only needed fields
  // Return structured data for all modules
}

// Update syllabus.tsx
const moduleIds = modulesData.map(m => m.id);
const batchContent = await getBatchModuleContentAction(moduleIds);
```

**Files to Modify**:
- `app/actions/module-content.ts` - Add `getBatchModuleContentAction`
- `components/course/syllabus.tsx` - Use batch loading

---

#### 1.2. Fix getModulesAction Duplicate ContentItems
**Priority**: 🔴 CRITICAL  
**Estimated Impact**: Fix syntax error, reduce query complexity

**Implementation**: Remove duplicate `contentItems` includes

**Files to Modify**:
- `app/actions/modules.ts:254-310` - Remove duplicates

---

#### 1.3. Optimize Module Content Queries with Select
**Priority**: 🟡 HIGH  
**Estimated Impact**: 30-50% reduction in payload size and query time

**Implementation**:
```typescript
// Instead of include: { video: true }
select: {
  id: true,
  vimeoUrl: true,
  duration: true,
  // Don't fetch transcript unless needed
}
```

**Files to Modify**:
- `app/actions/module-content.ts` - Use `select` instead of `include`
- `app/actions/learning-activities.ts` - Optimize selects

---

#### 1.4. Add Missing Database Indexes
**Priority**: 🟡 HIGH  
**Estimated Impact**: 50-70% faster queries on large datasets

**Implementation**:
```prisma
model ContentItem {
  // ... existing fields
  
  @@index([moduleId, studyPhase, contentType]) // For Phase 1 filtering
  @@index([moduleId, order, contentType])      // For ordered queries
}

model QuestionBankAttempt {
  // ... existing fields
  
  @@index([userId, questionId, completedAt])   // For most recent attempt
}
```

**Files to Modify**:
- `prisma/schema.prisma` - Add indexes
- Run migration: `npx prisma migrate dev --name add_performance_indexes`

---

### Phase 2: High-Impact Optimizations (Short-term - 3-5 days)

#### 2.1. Batch Load Videos/Notes in Tools
**Priority**: 🟡 HIGH  
**Estimated Impact**: 80% reduction in load time

**Implementation**: Similar to syllabus fix - create batch loading function

**Files to Modify**:
- `app/actions/module-content.ts` - Extend batch function
- `components/course/tools/videos-tool.tsx` - Use batch loading
- `components/course/tools/notes-tool.tsx` - Use batch loading

---

#### 2.2. Optimize Question Bank Queries
**Priority**: 🟡 HIGH  
**Estimated Impact**: 60% reduction in query count (3-4 → 1-2)

**Implementation**:
```typescript
// Single query with aggregation
const result = await prisma.$queryRaw`
  SELECT 
    q.id,
    q.question,
    q.options,
    q.correct_answer,
    COUNT(a.id) as attempt_count,
    MAX(a.completed_at) as last_attempt_at
  FROM question_bank_questions q
  LEFT JOIN question_bank_attempts a ON q.id = a.question_id AND a.user_id = ${userId}
  WHERE q.question_bank_id IN (${bankIds})
  GROUP BY q.id
`;
```

**Files to Modify**:
- `app/actions/question-bank-practice.ts` - Combine queries

---

#### 2.3. Implement Server-Side Aggregation for Learning Activities
**Priority**: 🟡 MEDIUM  
**Estimated Impact**: 50% faster (already optimized, but can improve further)

**Implementation**: Single SQL query with window functions to get attempt counts and most recent attempts

**Files to Modify**:
- `app/actions/learning-activity-attempts.ts` - Add aggregation query

---

#### 2.4. Add React Memoization
**Priority**: 🟢 MEDIUM  
**Estimated Impact**: 20-30% reduction in re-renders

**Implementation**:
```typescript
// Memoize expensive computations
const filteredActivities = useMemo(() => {
  return allActivities.filter(...);
}, [allActivities, selectedModuleId, selectedActivityType]);

// Memoize callbacks
const handleAnswerChange = useCallback((activityId: string, answers: any) => {
  // ...
}, []);
```

**Files to Modify**:
- `components/course/learning-activities-list.tsx` - Add memoization
- `components/course/syllabus.tsx` - Memoize content mapping

---

### Phase 3: Advanced Optimizations (Medium-term - 1-2 weeks)

#### 3.1. Implement Caching Layer
**Priority**: 🟢 MEDIUM  
**Estimated Impact**: 90% reduction for cached requests (<50ms)

**Implementation Options**:
- **Option A**: Next.js `unstable_cache` (built-in, simple)
- **Option B**: Redis (external, more powerful)
- **Option C**: In-memory cache (simple, but lost on restart)

**Recommendation**: Start with Next.js `unstable_cache` for module content, activities list

**Files to Modify**:
- `app/actions/module-content.ts` - Add caching
- `app/actions/learning-activities.ts` - Add caching
- Cache TTL: 5-10 minutes

---

#### 3.2. Code Splitting for Activity Components
**Priority**: 🟢 LOW  
**Estimated Impact**: 30-40% faster initial page load

**Implementation**:
```typescript
const ShortAnswerActivity = lazy(() => import('./activities/short-answer-activity'));
const FillInBlankActivity = lazy(() => import('./activities/fill-in-blank-activity'));
// ... etc
```

**Files to Modify**:
- `components/course/learning-activity-player.tsx` - Lazy load activity components

---

#### 3.3. Progressive Loading with Skeleton States
**Priority**: 🟢 LOW  
**Estimated Impact**: Perceived performance improvement

**Implementation**: Show skeleton loaders immediately, load data in background

**Files to Modify**:
- All loading components - Add skeleton states

---

#### 3.4. Denormalization for Attempt Counts
**Priority**: 🟢 LOW  
**Estimated Impact**: Eliminate aggregation queries

**Implementation**: Add `attemptCount` field to `LearningActivity`, update via database trigger

**Files to Modify**:
- `prisma/schema.prisma` - Add `attemptCount` field
- Create database trigger for auto-update

---

## Implementation Priority Matrix

| Task | Priority | Impact | Effort | ROI | Phase |
|------|----------|--------|--------|-----|-------|
| Fix Syllabus N+1 | 🔴 Critical | 90% | 2h | ⭐⭐⭐⭐⭐ | 1 |
| Fix getModulesAction duplicate | 🔴 Critical | 100% | 15m | ⭐⭐⭐⭐⭐ | 1 |
| Add database indexes | 🟡 High | 60% | 1h | ⭐⭐⭐⭐⭐ | 1 |
| Optimize module content selects | 🟡 High | 40% | 2h | ⭐⭐⭐⭐ | 1 |
| Batch load videos/notes | 🟡 High | 80% | 3h | ⭐⭐⭐⭐ | 2 |
| Optimize question bank queries | 🟡 High | 60% | 3h | ⭐⭐⭐⭐ | 2 |
| Server-side aggregation | 🟡 Medium | 50% | 4h | ⭐⭐⭐ | 2 |
| React memoization | 🟢 Medium | 25% | 2h | ⭐⭐⭐ | 2 |
| Caching layer | 🟢 Medium | 90% | 1d | ⭐⭐⭐ | 3 |
| Code splitting | 🟢 Low | 35% | 2h | ⭐⭐ | 3 |
| Progressive loading | 🟢 Low | 20% | 3h | ⭐⭐ | 3 |
| Denormalization | 🟢 Low | 30% | 1d | ⭐⭐ | 3 |

---

## Expected Performance Improvements

### Before Optimization:
- **Syllabus**: 2-5+ seconds (N+1 queries)
- **Learning Activities**: 200-500ms (✅ Already optimized)
- **Module Content**: 500ms-1s per module
- **Question Bank**: 500ms-1s
- **Videos/Notes Tools**: 2-5+ seconds (N+1 queries)

### After Phase 1 (Critical Fixes):
- **Syllabus**: 300-500ms (80-90% improvement)
- **Learning Activities**: 200-500ms (no change)
- **Module Content**: 200-400ms per module (50% improvement)
- **Question Bank**: 500ms-1s (no change yet)
- **Videos/Notes Tools**: 300-500ms (80-90% improvement)

### After Phase 2 (High-Impact):
- **Syllabus**: 200-300ms (with caching)
- **Learning Activities**: 100-200ms (with aggregation)
- **Module Content**: 100-200ms (with caching)
- **Question Bank**: 200-300ms (60% improvement)
- **Videos/Notes Tools**: 200-300ms (with caching)

### After Phase 3 (Advanced):
- **All pages**: <200ms initial load
- **Cached requests**: <50ms
- **Database queries**: <5 queries per page
- **Component re-renders**: Minimized

---

## Database Index Strategy

### Current Indexes (Good):
- ✅ `LearningActivityAttempt(userId, learningActivityId, completedAt)` - Composite index
- ✅ `ModuleProgress(userId, moduleId)` - Unique index
- ✅ `ContentItem(moduleId, order)` - Unique index

### Missing Critical Indexes:
- ❌ `ContentItem(moduleId, studyPhase, contentType)` - For Phase 1 filtering
- ❌ `ContentItem(moduleId, order, contentType)` - For ordered content queries
- ❌ `QuestionBankAttempt(userId, questionId, completedAt)` - For most recent attempts
- ❌ `QuizQuestion(quizId, order)` - Already unique, but index helps queries

### Index Creation SQL:
```sql
CREATE INDEX idx_content_items_module_phase_type 
ON content_items(module_id, study_phase, content_type);

CREATE INDEX idx_content_items_module_order_type 
ON content_items(module_id, "order", content_type);

CREATE INDEX idx_question_bank_attempts_user_question_completed 
ON question_bank_attempts(user_id, question_id, completed_at DESC);
```

---

## Code Quality Improvements

### 1. Query Optimization Patterns
- Always use `select` instead of `include` when possible
- Batch queries with `IN` clauses instead of loops
- Use `Promise.all()` for parallel async operations
- Avoid fetching unnecessary nested relations

### 2. Component Optimization Patterns
- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed to children
- Lazy load heavy components
- Implement skeleton loading states

### 3. Database Best Practices
- Add indexes for all `WHERE`, `ORDER BY`, and `JOIN` columns
- Use composite indexes for multi-column queries
- Avoid `SELECT *` - always specify needed fields
- Use database-level aggregation when possible

---

## Monitoring & Measurement

### Key Metrics to Track:
1. **Page Load Time**: Target <500ms
2. **Database Query Count**: Target <10 per page
3. **Database Query Time**: Target <100ms per query
4. **Payload Size**: Target <100KB per request
5. **Component Re-render Count**: Minimize unnecessary re-renders

### Tools:
- Next.js built-in performance monitoring
- Prisma query logging (already enabled)
- Browser DevTools Performance tab
- Database query analysis (EXPLAIN ANALYZE)

---

## Next Steps

1. **Immediate (Today)**:
   - [ ] Fix `getModulesAction` duplicate contentItems
   - [ ] Create `getBatchModuleContentAction` function
   - [ ] Update syllabus to use batch loading

2. **This Week**:
   - [ ] Add missing database indexes
   - [ ] Optimize module content queries with `select`
   - [ ] Fix videos/notes tools batch loading
   - [ ] Optimize question bank queries

3. **Next Week**:
   - [ ] Implement server-side aggregation
   - [ ] Add React memoization
   - [ ] Implement caching layer
   - [ ] Code splitting for activity components

---

## Risk Assessment

### Low Risk:
- Adding database indexes (can be rolled back)
- React memoization (no side effects)
- Code splitting (progressive enhancement)

### Medium Risk:
- Batch loading changes (need thorough testing)
- Query optimization (verify data correctness)
- Caching (need cache invalidation strategy)

### Mitigation:
- Test all changes in development first
- Use feature flags for gradual rollout
- Monitor error rates and performance metrics
- Keep rollback plan ready

---

## Conclusion

This optimization plan addresses **critical performance bottlenecks** that are currently causing 2-5+ second page loads. By implementing Phase 1 fixes alone, we can achieve **80-90% performance improvement** with minimal risk.

The plan is structured to deliver **immediate wins** (Phase 1) while building toward **long-term scalability** (Phase 3). Each phase builds on the previous one, ensuring steady improvement without breaking existing functionality.

**Estimated Total Impact**: 
- **Phase 1**: 80-90% improvement (2-5s → 300-500ms)
- **Phase 2**: Additional 50% improvement (300-500ms → 200-300ms)
- **Phase 3**: Final polish (<200ms with caching)

**Total Improvement**: **90-95% faster page loads** 🚀

