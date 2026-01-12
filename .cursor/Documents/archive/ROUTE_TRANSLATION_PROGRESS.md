# Route Translation Progress Tracker

## Status: In Progress

### Routes Already Translated ✅
- `/apprendre` - Learning interface (exists, uses slugs)
- `/paiement` - Payment checkout (exists)
- `/tableau-de-bord` - Dashboard (exists, partial)
- `/cohorte` - Cohort product page (exists)

### Routes Needing Translation
- `/cohorts` → `/cohorte` (standardize learning interface)
- `/dashboard` → `/tableau-de-bord` (complete migration)
- Update all component links

### Files Updated So Far
- ✅ `components/courses/course-detail.tsx` - Updated to use `/apprendre/` with slug
- ✅ `components/dashboard/tabs/courses-tab.tsx` - Updated to use `/apprendre/` with slug
- ✅ `components/course/learning-interface.tsx` - Updated Course type and links
- ✅ `components/course/course-sidebar.tsx` - Updated Course type and links
- ✅ `components/course/syllabus.tsx` - Updated links
- ✅ `components/course/todays-plan.tsx` - Updated links
- ✅ `components/course/ask-question-page.tsx` - Updated links

### Files Still Needing Updates
- `components/cohorts/cohort-detail.tsx` - `/cohorts/` → `/cohorte/`
- `components/dashboard/tabs/cohorts-tab.tsx` - `/cohorts/` → `/cohorte/`
- `components/payment/payment-form.tsx` - `/dashboard/student` → `/tableau-de-bord/etudiant`
- All admin dashboard components - `/dashboard/admin` → `/tableau-de-bord/admin`
- All student dashboard components - `/dashboard/student` → `/tableau-de-bord/etudiant`
- All actions with `revalidatePath` calls
- Middleware.ts
- Error pages

### Next Steps
1. Update cohort links (`/cohorts` → `/cohorte`)
2. Update dashboard links (`/dashboard` → `/tableau-de-bord`)
3. Update all revalidatePath calls in actions
4. Update middleware
5. Test all routes

