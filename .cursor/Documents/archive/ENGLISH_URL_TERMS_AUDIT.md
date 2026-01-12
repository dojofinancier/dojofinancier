# English URL Terms Audit - French Translation Plan

## Overview
This document lists all English terms found in URLs/routes throughout the application that should be translated to French for consistency.

## Current English Routes Found

### 1. `/learn` - Course Learning Interface
**Current Usage:**
- `/learn/[courseId]` - Main learning interface
- `/learn/[courseId]/ask-question` - Ask question page

**Found in:**
- `app/learn/[courseId]/page.tsx`
- `app/learn/[courseId]/ask-question/page.tsx`
- `app/learn/[courseId]/error.tsx`
- Multiple components linking to `/learn/...`

**Suggested French Equivalent:** `/apprendre` or `/etudier`
- `/apprendre` = "to learn" (more common, shorter)
- `/etudier` = "to study" (more formal)

**Recommendation:** `/apprendre` (shorter, more common)

---

### 2. `/checkout` - Payment Checkout
**Current Usage:**
- `/checkout` - Main checkout page
- `/checkout/[slug]` - Checkout with specific item
- `/checkout/error.tsx` - Checkout error page

**Found in:**
- `app/checkout/page.tsx`
- `app/checkout/[slug]/page.tsx`
- `app/checkout/error.tsx`
- Components redirecting to checkout

**Suggested French Equivalent:** `/paiement` or `/commande`
- `/paiement` = "payment" (direct translation)
- `/commande` = "order" (more e-commerce focused)

**Recommendation:** `/paiement` (clearer, more direct)

---

### 3. `/dashboard` - User Dashboard
**Current Usage:**
- `/dashboard` - Main dashboard (redirects based on role)
- `/dashboard/admin` - Admin dashboard
- `/dashboard/student` - Student dashboard
- `/dashboard/admin/courses` - Admin course management
- `/dashboard/admin/cohorts` - Admin cohort management
- `/dashboard/admin/students` - Admin student management
- `/dashboard/admin/orders` - Admin order management
- `/dashboard/admin/messages` - Admin messages
- `/dashboard/admin/appointments` - Admin appointments
- `/dashboard/admin/support-tickets` - Admin support tickets
- `/dashboard/admin/financials` - Admin financials
- `/dashboard/admin/coupons` - Admin coupons
- `/dashboard/admin/analytics` - Admin analytics
- `/dashboard/admin/setup` - Admin setup
- `/dashboard/profile` - User profile
- `/dashboard/payments` - Payment history

**Found in:**
- `app/(dashboard)/dashboard/` directory structure
- Multiple admin and student pages
- Navigation components

**Suggested French Equivalent:** `/tableau-de-bord` (already used in other app)
- `/tableau-de-bord` = "dashboard" (standard French term)

**Recommendation:** `/tableau-de-bord` (standard, already familiar)

---

### 4. `/admin` - Admin Section
**Current Usage:**
- Used as part of `/dashboard/admin/*` routes

**Suggested French Equivalent:** Keep as `/admin` or use `/administrateur`
- `/admin` = commonly used in French (short, understood)
- `/administrateur` = full French word (longer)

**Recommendation:** Keep `/admin` (widely understood, shorter)

---

### 5. `/student` - Student Section
**Current Usage:**
- `/dashboard/student` - Student dashboard

**Suggested French Equivalent:** `/etudiant` or `/eleve`
- `/etudiant` = "student" (university level)
- `/eleve` = "pupil" (school level)

**Recommendation:** `/etudiant` (more appropriate for adult learning)

---

### 6. `/profile` - User Profile
**Current Usage:**
- `/dashboard/profile` - User profile page

**Found in:**
- `app/(dashboard)/dashboard/profile/page.tsx`
- Navigation components

**Suggested French Equivalent:** `/profil`
- `/profil` = "profile" (direct translation, commonly used)

**Recommendation:** `/profil` (standard French term)

---

### 7. `/payments` - Payment History
**Current Usage:**
- `/dashboard/payments` - Payment history page

**Found in:**
- `app/(dashboard)/dashboard/payments/page.tsx`

**Suggested French Equivalent:** `/paiements`
- `/paiements` = "payments" (plural form)

**Recommendation:** `/paiements` (direct translation)

---

### 8. `/courses` - Courses Listing (Already Redirects)
**Current Usage:**
- `/courses` - Redirects to `/formations`
- `/courses/[courseId]` - Redirects to `/formations/[courseId]`

**Status:** ✅ Already handled (redirects to `/formations`)

---

### 9. `/messages` - Messages (In Tabs, Not Routes)
**Current Usage:**
- Used in dashboard tabs: `?tab=messages`

**Status:** ⚠️ Not a route, but used in query parameters

**Recommendation:** Keep as `?tab=messages` or change to `?tab=messages` (query params are less visible)

---

### 10. `/appointments` - Appointments (In Tabs, Not Routes)
**Current Usage:**
- Used in dashboard tabs: `?tab=appointments`
- Admin route: `/dashboard/admin/appointments`

**Found in:**
- `app/(dashboard)/dashboard/admin/appointments/`

**Suggested French Equivalent:** `/rendez-vous`
- `/rendez-vous` = "appointment" (standard French term)

**Recommendation:** `/rendez-vous` for admin route, keep `?tab=appointments` for tabs (or change to `?tab=rendez-vous`)

---

### 11. `/support` - Support (In Tabs, Not Routes)
**Current Usage:**
- Used in dashboard tabs: `?tab=support`
- Admin route: `/dashboard/admin/support-tickets`

**Status:** ⚠️ Tab parameter, admin route uses `/support-tickets`

**Recommendation:** Keep `?tab=support` or change to `?tab=support` (query params)

---

### 12. `/cohorts` - Cohorts (Mixed)
**Current Usage:**
- `/cohorts/[slug]` - Cohort learning interface
- `/cohorte/[slug]` - Cohort product page (already French!)

**Status:** ⚠️ Inconsistent - `/cohorts` vs `/cohorte`

**Recommendation:** Standardize to `/cohorte` (already used for product page)

---

## Summary of Recommended Changes

### High Priority (Main Routes)
1. `/learn` → `/apprendre`
2. `/checkout` → `/paiement`
3. `/dashboard` → `/tableau-de-bord`
4. `/dashboard/student` → `/tableau-de-bord/etudiant`
5. `/dashboard/profile` → `/tableau-de-bord/profil`
6. `/dashboard/payments` → `/tableau-de-bord/paiements`
7. `/dashboard/admin/appointments` → `/tableau-de-bord/admin/rendez-vous`
8. `/cohorts` → `/cohorte` (standardize)

### Medium Priority (Query Parameters)
- `?tab=messages` → `?tab=messages` (keep or change to `?tab=messages`)
- `?tab=appointments` → `?tab=rendez-vous`
- `?tab=support` → `?tab=support` (keep or change)

### Low Priority (Keep as-is)
- `/admin` - Keep (widely understood)
- `/api/*` - Keep (API routes typically stay in English)

## Complete Route Mapping

| Current English Route | Suggested French Route | Priority |
|----------------------|------------------------|----------|
| `/learn/[courseId]` | `/apprendre/[slug]` | High |
| `/learn/[courseId]/ask-question` | `/apprendre/[slug]/poser-question` | High |
| `/checkout` | `/paiement` | High |
| `/checkout/[slug]` | `/paiement/[slug]` | High |
| `/dashboard` | `/tableau-de-bord` | High |
| `/dashboard/student` | `/tableau-de-bord/etudiant` | High |
| `/dashboard/profile` | `/tableau-de-bord/profil` | High |
| `/dashboard/payments` | `/tableau-de-bord/paiements` | High |
| `/dashboard/admin` | `/tableau-de-bord/admin` | High |
| `/dashboard/admin/appointments` | `/tableau-de-bord/admin/rendez-vous` | Medium |
| `/cohorts/[slug]` | `/cohorte/[slug]` | High |

## Implementation Considerations

### 1. Backward Compatibility
- Keep old routes with redirects for 3-6 months
- Update all internal links gradually
- Monitor 404 errors for old routes

### 2. SEO Impact
- Set up 301 redirects (permanent)
- Update sitemap.xml
- Update internal links
- Update external links if any

### 3. Code Changes Required
- Update all `href`, `router.push()`, `redirect()` calls
- Update route definitions
- Update middleware.ts
- Update navigation components
- Update error pages
- Update revalidatePath() calls

### 4. Testing Checklist
- [ ] All routes work with new French URLs
- [ ] Old routes redirect correctly
- [ ] Internal links updated
- [ ] Navigation menus updated
- [ ] Error pages updated
- [ ] Admin routes work
- [ ] Student routes work
- [ ] Checkout flow works
- [ ] Learning interface works
- [ ] No broken links

## Files That Need Updates

### Route Files
- `app/learn/` → `app/apprendre/`
- `app/checkout/` → `app/paiement/`
- `app/(dashboard)/dashboard/` → `app/(dashboard)/tableau-de-bord/`

### Components (Search for hardcoded paths)
- All components with `/learn/`
- All components with `/checkout/`
- All components with `/dashboard/`
- Navigation components
- Error pages
- Payment components
- Course components

### Actions (revalidatePath calls)
- `app/actions/courses.ts`
- `app/actions/study-plan.ts`
- `app/actions/student-notes.ts`
- `app/actions/exams.ts`
- `app/actions/learning-activities-csv.ts`
- `app/actions/csv-upload.ts`
- `app/actions/appointment-payment.ts`
- `app/actions/availability-rules.ts`

### Middleware
- `middleware.ts` - Update public routes list

## Next Steps

1. **Review and approve** French translations
2. **Create migration plan** similar to slug migration
3. **Implement redirects** for backward compatibility
4. **Update routes** gradually
5. **Update components** systematically
6. **Test thoroughly**
7. **Monitor** for broken links

