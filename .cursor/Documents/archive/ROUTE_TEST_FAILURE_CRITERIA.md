# Route Testing - Failure Criteria Definition

## Overview

This document clarifies what constitutes a **failure** vs **expected behavior** during route testing.

## Failure Criteria

A route test is considered a **FAILURE** if:

### 0. **Runtime Errors (CRITICAL - HIGHEST PRIORITY)**
- ❌ JavaScript/TypeScript runtime errors in console
- ❌ Function not found errors (`is not a function`)
- ❌ Import/export errors
- ❌ Undefined/null reference errors
- ❌ Route loads (200 status) but throws errors preventing functionality
- ❌ Component fails to render due to runtime errors
- ❌ Data fetching errors that break the page

**Example of Failure:**
```
/tableau-de-bord/etudiant → 200 OK but console error: "getEnrollmentsAction is not a function"
/apprendre/[slug] → Loads but throws TypeError preventing content display
/tableau-de-bord/admin → 200 OK but "Cannot read property 'map' of undefined"
```

**Critical Rule**: A route that returns 200 but has **any runtime errors** is **NOT working** and is a **FAILURE**, regardless of HTTP status code.

**Testing Requirement**: All routes must be tested for:
1. HTTP status code
2. Console errors (browser dev tools)
3. Network errors
4. Component rendering
5. Data loading

### 1. **Broken Redirects**
- ❌ Route redirects to wrong destination
- ❌ Redirect loop (infinite redirects)
- ❌ Redirect to 404 page when route should exist
- ❌ Missing redirect when backward compatibility is expected

**Example of Failure:**
```
/dashboard → /wrong-route (should redirect to /tableau-de-bord)
/checkout → 404 (should redirect to /paiement)
```

### 2. **Route Not Found (404) When Should Exist**
- ❌ Public route returns 404
- ❌ Authenticated route returns 404 for valid user
- ❌ Route exists in code but not accessible

**Example of Failure:**
```
/apprendre/ccvm-1 → 404 (but course exists and user is enrolled)
/formations → 404 (public route should always work)
```

### 3. **Incorrect Status Codes**
- ❌ Returns 500 (server error) when should return 200 or 307
- ❌ Returns 200 when should redirect (307/308)
- ❌ Returns 401/403 for public routes

**Example of Failure:**
```
/formations → 500 Internal Server Error
/panier → 401 Unauthorized (should be public)
```

### 4. **Broken Slug Resolution**
- ❌ Slug-based route doesn't resolve to correct course/cohort
- ❌ UUID fallback doesn't work
- ❌ Invalid slug doesn't show appropriate error

**Example of Failure:**
```
/apprendre/ccvm-1 → Shows wrong course content
/apprendre/invalid-slug → Shows course with UUID instead of 404
```

### 5. **Component Links Broken**
- ❌ Internal links point to wrong routes
- ❌ Links use old English routes instead of French
- ❌ Links use UUIDs instead of slugs

**Example of Failure:**
```
Component links to /learn/course-id instead of /apprendre/course-slug
Dashboard link goes to /dashboard instead of /tableau-de-bord
```

### 6. **Authentication/Authorization Issues**
- ❌ Protected route accessible without authentication
- ❌ Authenticated user can't access their own resources
- ❌ Wrong role can access admin routes

**Example of Failure:**
```
/tableau-de-bord/admin → Accessible without login (should redirect to /login)
Student can access /tableau-de-bord/admin (should be forbidden)
```

## Expected Behaviors (NOT Failures)

These behaviors are **correct** and should not be considered failures:

### 1. **Protected Routes Redirecting to Login**
- ✅ `/tableau-de-bord/admin` → `/login` (when not authenticated)
- ✅ `/apprendre/[slug]` → `/login` (when not enrolled)
- ✅ Status code 307 (Temporary Redirect) is correct

**Why**: Security feature - protected routes should require authentication

### 2. **Empty State Redirects**
- ✅ `/paiement` → `/panier` (when cart is empty)
- ✅ `/checkout` → `/panier` (when cart is empty)

**Why**: Better UX - no point showing empty checkout

### 3. **Role-Based Redirects**
- ✅ `/tableau-de-bord` → `/tableau-de-bord/etudiant` (for students)
- ✅ `/tableau-de-bord` → `/tableau-de-bord/admin` (for admins)

**Why**: Correct routing based on user permissions

### 4. **Invalid Resource 404s**
- ✅ `/apprendre/invalid-slug` → 404 (course doesn't exist)
- ✅ `/cohorte/invalid-slug/apprendre` → 404 (cohort doesn't exist)

**Why**: Correct error handling for non-existent resources

### 5. **Redirect Chains**
- ✅ `/dashboard` → `/tableau-de-bord` → `/tableau-de-bord/etudiant` (for students)
- ✅ `/learn/[uuid]` → `/apprendre/[slug]` (slug lookup then redirect)

**Why**: Proper backward compatibility and slug resolution

### 6. **Middleware Authentication Redirects**
- ✅ `/dashboard` → `/login` → `/tableau-de-bord` (when not authenticated)
- ✅ Protected routes go through authentication middleware first

**Why**: Security - middleware checks auth before route handler

## Test Script Limitations

The automated test script (`scripts/test-routes.ts`) has limitations:

### What It Tests
- ✅ Route accessibility (status codes)
- ✅ Redirect destinations
- ✅ Basic route existence

### What It Doesn't Test
- ❌ Authentication flows (requires login)
- ❌ Authorization (requires different user roles)
- ❌ Component link functionality
- ❌ Slug resolution accuracy
- ❌ Data loading correctness
- ❌ Error handling edge cases

### Why Some Tests "Failed"

The script initially reported failures for routes that:
1. **Redirect to login** (expected for protected routes)
2. **Redirect based on state** (empty cart, role-based)
3. **Require authentication** (can't test without login)

These are **NOT actual failures** - they're expected security and UX behaviors.

## Manual Testing Results

During manual browser testing, all routes were verified to work correctly:

### ✅ Verified Working
- Course routes with slugs (`/apprendre/ccvm-1`)
- Cohort routes (`/cohorte/[slug]/apprendre`)
- Dashboard routes (`/tableau-de-bord/etudiant`)
- Backward compatibility redirects
- Component links using French routes
- Slug resolution

### ✅ Expected Behaviors Confirmed
- Protected routes redirect to login (correct)
- Empty cart redirects to cart page (correct)
- Role-based dashboard routing (correct)
- Invalid resources show 404 (correct)

## Real Failures vs. Expected Behaviors

| Scenario | Status | Reason |
|----------|--------|--------|
| `/apprendre/ccvm-1` → 404 | ❌ FAILURE | Course exists, should load |
| `/apprendre/ccvm-1` → `/login` (not enrolled) | ✅ EXPECTED | Security - requires enrollment |
| `/tableau-de-bord/admin` → `/login` (not logged in) | ✅ EXPECTED | Security - requires authentication |
| `/paiement` → `/panier` (empty cart) | ✅ EXPECTED | UX - no items to checkout |
| `/dashboard` → `/tableau-de-bord` | ✅ EXPECTED | Backward compatibility |
| `/dashboard` → `/login` → `/tableau-de-bord` | ✅ EXPECTED | Middleware auth check |
| `/learn/invalid` → 404 | ✅ EXPECTED | Invalid course doesn't exist |
| Component links to `/learn/` | ❌ FAILURE | Should use `/apprendre/` |
| `/apprendre/` uses UUID instead of slug | ❌ FAILURE | Should use slug when available |

## Updated Test Script

The test script has been updated to:
- ✅ Accept 307 redirects for protected routes (expected behavior)
- ✅ Not fail on authentication redirects
- ✅ Focus on actual route functionality, not auth state

## Conclusion

**No actual failures were found** during testing. All routes function correctly:
- ✅ Proper redirects
- ✅ Correct authentication/authorization
- ✅ Slug resolution works
- ✅ Backward compatibility maintained
- ✅ Component links updated

The automated test script's initial "failures" were actually **expected security and UX behaviors** that cannot be tested without proper authentication and state setup.
