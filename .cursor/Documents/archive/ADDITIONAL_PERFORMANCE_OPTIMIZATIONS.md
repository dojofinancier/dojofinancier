# Additional Performance Optimizations

**Date**: December 2024  
**Status**: Critical Performance Issues Identified

## Current Performance Issues

From terminal logs analysis:
- **Render times**: 1.2-3.7 seconds (target: <500ms)
- **Query patterns**: Still seeing multiple sequential queries
- **Learning Activities**: 1.5-1.8 seconds for attempt queries alone
- **No parallel execution**: Activities and attempts loaded sequentially

## Critical Optimizations Needed

### 1. **Optimize getStudentLearningActivitiesAction** 🔴 CRITICAL
**Current Issues**:
- Using `include` instead of `select` (fetches unnecessary data)
- Redundant module includes (both `module` and `contentItem.module`)
- No caching
- Enrollment check on every request

**Fix**:
- Use `select` to fetch only needed fields
- Remove redundant includes
- Add caching with `unstable_cache`
- Cache enrollment check separately

### 2. **Parallel Loading** 🔴 CRITICAL
**Current Issue**: Activities and attempts loaded sequentially
```typescript
// Current (sequential):
const result = await getStudentLearningActivitiesAction(courseId);
const batchAttemptsResult = await getBatchLearningActivityAttempts(activityIds);
```

**Fix**: Load in parallel
```typescript
// Optimized (parallel):
const [result, batchAttemptsResult] = await Promise.all([
  getStudentLearningActivitiesAction(courseId),
  // Pre-fetch attempts (will be filtered by activityIds after)
]);
```

### 3. **Reduce Data Transfer** 🟡 HIGH
**Current Issues**:
- Fetching full `content` and `correctAnswers` JSON for all activities
- Fetching unnecessary module data
- Large JSON payloads

**Fix**:
- Only fetch `content` and `correctAnswers` when activity is viewed
- Use lightweight activity list endpoint
- Lazy load full activity data

### 4. **Add Aggressive Caching** 🟡 HIGH
**Current**: Only module content cached
**Needed**:
- Cache activities list (5 min TTL)
- Cache enrollment status (10 min TTL)
- Cache modules list (10 min TTL)

### 5. **Optimize Database Queries** 🟡 HIGH
**Current Issues**:
- LEFT JOIN in learning activities query
- Multiple queries for modules/contentItems
- No query result caching

**Fix**:
- Use direct WHERE clause instead of LEFT JOIN
- Combine queries where possible
- Add database-level query result caching

### 6. **Streaming SSR** 🟢 MEDIUM
**Current**: Full page render waits for all data
**Fix**: Use React Server Components streaming
- Show skeleton immediately
- Stream data as it loads

### 7. **Prefetching** 🟢 MEDIUM
**Current**: No prefetching
**Fix**:
- Prefetch activities on course page hover
- Prefetch attempts in background
- Use Next.js `<Link prefetch>`

### 8. **Reduce Re-renders** 🟢 MEDIUM
**Current**: Multiple state updates causing re-renders
**Fix**:
- Batch state updates
- Use `useTransition` for non-urgent updates
- Memoize expensive computations

---

## Implementation Priority

### Immediate (Today):
1. ✅ Fix null check in learning-activities-list (DONE)
2. Optimize `getStudentLearningActivitiesAction` with `select`
3. Implement parallel loading
4. Add caching to activities list

### Short-term (This Week):
5. Reduce data transfer (lazy load activity content)
6. Add enrollment caching
7. Optimize database queries

### Medium-term (Next Week):
8. Implement streaming SSR
9. Add prefetching
10. Reduce re-renders with useTransition

---

## Expected Impact

### After Immediate Fixes:
- **Activities page**: 1.5-1.8s → 300-500ms (70% improvement)
- **Query count**: 5-7 → 2-3 queries
- **Data transfer**: 50-70% reduction

### After Short-term:
- **Activities page**: 300-500ms → 100-200ms (80% improvement)
- **Query count**: 2-3 → 1-2 queries
- **Cached requests**: <50ms

### After Medium-term:
- **All pages**: <200ms initial, <50ms cached
- **Perceived performance**: Instant with prefetching

