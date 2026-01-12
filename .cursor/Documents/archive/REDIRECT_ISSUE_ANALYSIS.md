# Redirect Issue Analysis

**Date**: December 2024  
**Issue**: User navigates to dashboard, page briefly loads, then redirects back to home page

## Problem Flow

1. User clicks "Tableau de bord" (student dashboard)
2. Page starts loading (`/dashboard/student`)
3. `requireStudent()` is called in the page component
4. `requireStudent()` calls `requireAuth()`
5. `requireAuth()` calls `getCurrentUser()`
6. `getCurrentUser()` tries to get Supabase user
7. **Issue**: If `getCurrentUser()` returns `null` or fails, `requireAuth()` redirects to `/login`
8. But if user IS authenticated but something else fails, there might be a redirect loop

## Potential Issues

### Issue 1: Race Condition in Authentication
- Supabase session might not be fully established when `getCurrentUser()` is called
- Middleware updates session, but page component runs before session is ready
- Result: `getCurrentUser()` returns `null` → redirect to `/login`

### Issue 2: User Sync Failure
- `getUserFromSupabaseId()` might fail or return `null`
- Even if Supabase user exists, Prisma user might not be found
- Result: `getCurrentUser()` returns `null` → redirect to `/login`

### Issue 3: Redirect Loop
- `requireStudent()` redirects to `/dashboard` if user is not a student
- `/dashboard` redirects to `/dashboard/student` if user is a student
- If role check fails temporarily, this could cause a loop

### Issue 4: Middleware Redirect
- Middleware checks authentication and redirects to `/login` if no user
- But this happens AFTER the page component starts loading
- Result: Page loads briefly, then middleware redirect kicks in

## Root Cause Hypothesis

The most likely issue is **Issue 1: Race Condition**:
- Middleware updates session asynchronously
- Page component runs `requireStudent()` immediately
- `getCurrentUser()` is called before Supabase session is fully established
- Returns `null` → redirect to `/login`
- But user IS logged in, so they get redirected back
- This creates a brief flash of the page before redirect

## Solution

1. **Add error handling and logging** to see what's actually happening
2. **Ensure session is established** before checking auth in page components
3. **Add retry logic** for `getCurrentUser()` if it fails initially
4. **Fix redirect logic** to avoid loops

