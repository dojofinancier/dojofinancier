# Course Slug Migration Plan: UUID to Human-Readable Slugs

## Overview
This document outlines the systematic migration from UUID-based course identifiers to human-readable slugs based on course codes (code du cours).

## Current State Analysis

### Database Schema
- ✅ Course model already has `slug` field (optional, unique)
- ✅ Course model has `code` field (optional, unique)
- ✅ Slug generation utility exists (`lib/utils/slug.ts`)
- ⚠️ Many courses may not have slugs yet
- ⚠️ Some routes use UUID, some use slug

### Current Route Structure
1. **`/formations/[slug]`** - Public course detail page (uses slug)
2. **`/learn/[courseId]`** - Learning interface (supports both UUID and slug)
3. **`/courses/[courseId]`** - Alternative route (needs verification)
4. **`/dashboard/admin/courses/[courseId]`** - Admin course detail (uses UUID)

### Current Code Patterns
- `getCourseBySlugOrIdAction()` - Handles both UUID and slug (backward compatible)
- `getPublishedCourseBySlugAction()` - Handles both UUID and slug
- Some components link using `course.id` (UUID)
- Some components link using `course.slug` (if available)

## Migration Strategy

### Phase 1: Data Migration (No Breaking Changes)
**Goal**: Ensure all courses have slugs without breaking existing functionality

1. **Create migration script** to generate slugs for all courses without slugs
2. **Update course creation/update actions** to always generate slugs from code
3. **Add database constraint** to make slug required (after migration)

### Phase 2: Route Updates (Backward Compatible)
**Goal**: Update routes to prefer slugs while maintaining UUID support

1. **Update `/learn/[courseId]`** to redirect UUIDs to slugs
2. **Update `/courses/[courseId]`** to use slug route
3. **Keep backward compatibility** for existing UUID links

### Phase 3: Component Updates (Gradual)
**Goal**: Update all components to use slugs instead of UUIDs

1. **Update dashboard links** to use `course.slug`
2. **Update navigation components** to use slugs
3. **Update internal links** throughout the app

### Phase 4: Cleanup (Optional)
**Goal**: Remove UUID support after migration period

1. **Remove UUID fallback logic** (after sufficient time)
2. **Add validation** to prevent UUID usage
3. **Update documentation**

## Implementation Steps

### Step 1: Create Slug Generation Script

**File**: `scripts/generate-course-slugs.ts`

```typescript
/**
 * Migration script to generate slugs for all courses without slugs
 * Run: npx tsx scripts/generate-course-slugs.ts
 */

import { prisma } from "@/lib/prisma";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug";

async function generateCourseSlugs() {
  console.log("Starting course slug generation...");

  // Get all courses without slugs
  const coursesWithoutSlugs = await prisma.course.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: "" },
      ],
    },
    select: {
      id: true,
      code: true,
      title: true,
      slug: true,
    },
  });

  console.log(`Found ${coursesWithoutSlugs.length} courses without slugs`);

  if (coursesWithoutSlugs.length === 0) {
    console.log("✅ All courses already have slugs!");
    return;
  }

  // Get all existing slugs to avoid duplicates
  const existingSlugs = await prisma.course.findMany({
    where: { slug: { not: null } },
    select: { slug: true },
  }).then(courses => courses.map(c => c.slug).filter(Boolean) as string[]);

  let successCount = 0;
  let errorCount = 0;

  for (const course of coursesWithoutSlugs) {
    try {
      let slug: string;

      if (course.code) {
        // Generate slug from code
        const baseSlug = generateSlug(course.code);
        slug = generateUniqueSlug(baseSlug, existingSlugs);
      } else {
        // Fallback to title if no code
        const baseSlug = generateSlug(course.title);
        slug = generateUniqueSlug(baseSlug, existingSlugs);
        console.warn(`⚠️  Course ${course.id} has no code, using title for slug: ${slug}`);
      }

      // Update course with slug
      await prisma.course.update({
        where: { id: course.id },
        data: { slug },
      });

      existingSlugs.push(slug);
      successCount++;
      console.log(`✅ Generated slug for ${course.code || course.title}: ${slug}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error generating slug for course ${course.id}:`, error);
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
}

generateCourseSlugs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Step 2: Update Course Actions

**File**: `app/actions/courses.ts`

**Changes needed**:
1. ✅ Already generates slug from code on create (lines 59-68)
2. ✅ Already regenerates slug on code update (lines 131-143)
3. ⚠️ **Add validation**: Ensure slug is always generated (make it required in schema after migration)

### Step 3: Update Routes to Prefer Slugs

#### 3.1 Update `/learn/[courseId]` Route

**File**: `app/learn/[courseId]/page.tsx`

**Strategy**: 
- If UUID is provided, look up course and redirect to slug-based URL
- If slug is provided, use it directly
- Keep UUID support for backward compatibility during transition

**Changes**:
```typescript
// After line 46, add redirect logic:
if (isUUID(courseId) && courseSlug) {
  // Redirect UUID to slug for better URLs
  redirect(`/learn/${courseSlug}${contentItemId ? `?contentItemId=${contentItemId}` : ''}`);
}
```

#### 3.2 Update `/courses/[courseId]` Route (if exists)

**File**: `app/courses/[courseId]/page.tsx`

**Strategy**: Redirect to `/formations/[slug]` route

### Step 4: Update Components to Use Slugs

#### Components to Update:

1. **`components/dashboard/student-dashboard.tsx`**
   - Update course links from `/learn/${course.id}` to `/learn/${course.slug || course.id}`

2. **`components/courses/course-detail.tsx`**
   - Update enrollment links to use slug

3. **`components/admin/courses/*`**
   - Update preview links to use slug
   - Update navigation to use slug

4. **Any component with course links**
   - Search for: `course.id`, `/learn/`, `/formations/`
   - Replace with: `course.slug || course.id` (fallback for safety)

### Step 5: Update Database Schema (After Migration)

**File**: `prisma/schema.prisma`

**Change**:
```prisma
slug  String  @unique // Make required after migration
```

**Migration**:
```bash
npx prisma db push
# or
npx prisma migrate dev --name make_slug_required
```

## Backward Compatibility Strategy

### During Migration Period (Recommended: 1-2 months)

1. **Keep UUID support** in all lookup functions
2. **Redirect UUIDs to slugs** when possible
3. **Log UUID usage** to track migration progress
4. **Show warnings** in admin panel for courses without slugs

### After Migration Period

1. **Remove UUID fallback** from lookup functions
2. **Add validation** to prevent UUID usage
3. **Update all internal links** to use slugs only

## Testing Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Test slug generation script on staging
- [ ] Verify all courses have codes (or titles as fallback)

### Migration
- [ ] Run slug generation script
- [ ] Verify all courses have slugs
- [ ] Check for duplicate slugs
- [ ] Test course creation with code → slug generation

### Post-Migration
- [ ] Test all routes with slugs
- [ ] Test UUID redirects work
- [ ] Test course detail pages
- [ ] Test learning interface
- [ ] Test admin course management
- [ ] Test enrollment flow
- [ ] Test all internal links
- [ ] Test search functionality
- [ ] Test course sharing/URLs

## Rollback Plan

If issues occur:

1. **Revert route changes** (keep UUID support)
2. **Slugs remain in database** (no data loss)
3. **Components can fallback** to UUIDs
4. **No breaking changes** to existing functionality

## Files to Modify

### Core Files
- [ ] `scripts/generate-course-slugs.ts` (NEW)
- [ ] `app/actions/courses.ts` (verify slug generation)
- [ ] `app/learn/[courseId]/page.tsx` (add redirect)
- [ ] `app/formations/[slug]/page.tsx` (verify works)
- [ ] `app/courses/[courseId]/page.tsx` (redirect to formations)

### Component Files (Search and Update)
- [ ] `components/dashboard/student-dashboard.tsx`
- [ ] `components/courses/course-detail.tsx`
- [ ] `components/admin/courses/*` (all admin course components)
- [ ] `components/course/*` (all course learning components)
- [ ] Any component with course navigation links

### Schema
- [ ] `prisma/schema.prisma` (make slug required after migration)

## Migration Timeline

### Week 1: Preparation
- Create migration script
- Test on staging
- Review all course codes

### Week 2: Data Migration
- Run migration script
- Verify all courses have slugs
- Test slug uniqueness

### Week 3: Route Updates
- Update routes with redirects
- Test backward compatibility
- Monitor for issues

### Week 4: Component Updates
- Update all component links
- Test all user flows
- Fix any broken links

### Week 5+: Monitoring
- Monitor UUID usage
- Collect feedback
- Plan cleanup phase

## Success Criteria

✅ All courses have slugs generated from codes
✅ All routes work with slugs
✅ UUID redirects work correctly
✅ No broken links in the application
✅ All new courses automatically get slugs
✅ Admin can see/edit course slugs

## Notes

- **Slug Format**: Lowercase, hyphenated, no special characters
- **Uniqueness**: Handled by `generateUniqueSlug()` function
- **Fallback**: If no code, use title (with warning)
- **Validation**: Ensure codes are unique and meaningful
- **SEO**: Human-readable slugs improve SEO

## Questions to Resolve

1. What should happen if a course code changes? (Regenerate slug?)
2. Should we allow manual slug editing in admin?
3. How long should UUID support remain? (Recommendation: 3-6 months)
4. Should we add slug validation rules? (e.g., min/max length)

