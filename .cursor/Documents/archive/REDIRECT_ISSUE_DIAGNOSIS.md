# Redirect Issue Diagnosis

**Date**: December 2024  
**Symptom**: User navigates to dashboard, page briefly loads, then redirects back to home page

## Analysis

### Authentication Flow:
1. User clicks "Tableau de bord" → navigates to `/dashboard/student`
2. Middleware runs → checks Supabase session
3. Page component loads → calls `requireStudent()`
4. `requireStudent()` → calls `requireAuth()`
5. `requireAuth()` → calls `getCurrentUser()`
6. `getCurrentUser()` → checks Supabase + Prisma user

### Potential Issues:

#### Issue 1: User Sync Failure (Most Likely)
**Scenario**: Supabase user exists, but Prisma user doesn't
- `getCurrentUser()` returns `null`
- `requireAuth()` redirects to `/login`
- But user IS logged in to Supabase
- Middleware sees user is logged in
- Creates redirect loop or confusion

**Fix Applied**: ✅ Auto-sync missing Prisma users

#### Issue 2: Session Cookie Not Readable
**Scenario**: Supabase session exists but cookies aren't readable in server component
- `createClient()` can't read cookies
- `getUser()` returns null
- Redirect happens

**Possible Cause**: Cookie domain/path issues, or Next.js cookie handling

#### Issue 3: Race Condition
**Scenario**: Middleware updates session, but page component runs before update completes
- Page component checks auth before session is ready
- Returns null
- Redirects

#### Issue 4: Redirect Loop
**Scenario**: 
- User is STUDENT but role check fails temporarily
- `requireStudent()` redirects to `/dashboard`
- `/dashboard` redirects to `/dashboard/student`
- Loop continues

## Fixes Implemented

1. ✅ **Auto-sync missing users** - Prevents Issue 1
2. ✅ **Enhanced logging** - Helps diagnose which issue is occurring
3. ✅ **Better error handling** - Prevents silent failures
4. ✅ **Improved dashboard redirect** - Handles all roles explicitly

## Next Steps for Debugging

1. **Check browser console** for authentication logs
2. **Check server terminal** for:
   - `[getCurrentUser]` messages
   - `[requireAuth]` messages
   - `[requireStudent]` messages
3. **Check if user exists in database**:
   - Query Prisma: `SELECT * FROM users WHERE email = 'user@example.com'`
   - Check if `supabase_id` matches Supabase user ID

## If Issue Persists

The logs will tell us:
- If Supabase user is found → Cookie/session issue
- If Prisma user is missing → Sync issue (should auto-fix now)
- If role is wrong → Role assignment issue
- If redirect loop → Need to fix redirect logic

