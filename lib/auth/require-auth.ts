import { redirect } from "next/navigation";
import { getCurrentUser } from "./get-current-user";

/**
 * Requires authentication - redirects to login if not authenticated
 * Returns the current user
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    console.log("[requireAuth] No user found, redirecting to /login");
    redirect("/login");
  }

  return user;
}

/**
 * Requires admin role - redirects to dashboard if not admin
 * Returns the current admin user
 */
export async function requireAdmin() {
  const user = await requireAuth();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
}

/**
 * Requires student role - redirects to dashboard if not student
 * Returns the current student user
 */
export async function requireStudent() {
  const user = await requireAuth();

  if (user.role !== "STUDENT") {
    console.log(`[requireStudent] User role is ${user.role}, not STUDENT. Redirecting to /dashboard`);
    redirect("/dashboard");
  }

  return user;
}

/**
 * Requires instructor role - redirects to dashboard if not instructor
 * Returns the current instructor user
 */
export async function requireInstructor() {
  const user = await requireAuth();

  if (user.role !== "INSTRUCTOR") {
    redirect("/dashboard");
  }

  return user;
}

/**
 * Requires admin or instructor role - redirects to dashboard if neither
 * Returns the current admin or instructor user
 */
export async function requireAdminOrInstructor() {
  const user = await requireAuth();

  if (user.role !== "ADMIN" && user.role !== "INSTRUCTOR") {
    redirect("/dashboard");
  }

  return user;
}

