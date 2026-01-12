import { createClient } from "@/lib/supabase/server";
import { getUserFromSupabaseId } from "./user-sync";
import { logServerError } from "@/lib/utils/error-logging";

/**
 * Gets the current authenticated user (Prisma User + Supabase Auth)
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Missing session is expected when user is logged out - don't log as error
      const isMissingSession = error.message.includes("session missing") || 
                               error.message.includes("Auth session missing");
      
      if (isMissingSession) {
        // Silent return for missing sessions (expected when logged out)
        return null;
      }
      
      // Log actual errors (not missing sessions)
      console.error(`[getCurrentUser] Supabase auth error:`, error.message);
      
      return null;
    }

    if (!supabaseUser) {
      // Expected when logged out; do not retry (retries can trip Next prerender hanging promises)
      return null;
    }

    // Get Prisma user record
    let user = await getUserFromSupabaseId(supabaseUser.id);

    if (!user) {
      console.warn(`[getCurrentUser] No Prisma user found for Supabase ID: ${supabaseUser.id}, attempting to sync...`);
      // Try to sync/create the user automatically
      try {
        const { syncUserFromSupabase } = await import("./user-sync");
        user = await syncUserFromSupabase(
          supabaseUser,
          supabaseUser.user_metadata?.first_name || null,
          supabaseUser.user_metadata?.last_name || null,
          supabaseUser.user_metadata?.phone || null
        );
        console.log(`[getCurrentUser] Successfully synced user: ${user.email}`);
      } catch (syncError) {
        console.error(`[getCurrentUser] Failed to sync user:`, syncError);
        // Log this as it's a data sync issue
        await logServerError({
          errorMessage: `User sync issue: Supabase user exists (${supabaseUser.id}) but no Prisma user found and sync failed`,
          stackTrace: syncError instanceof Error ? syncError.stack : undefined,
          severity: "HIGH",
        });
        return null;
      }
    }

    return {
      ...user,
      supabaseUser, // Include Supabase user data
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // In Next.js, `cookies()` / `headers()` can throw during prerender/static evaluation.
    // That can happen when this is invoked from layouts/navbars while a route is being prerendered.
    // This is not a "real" production error and should not spam error logs/webhooks.
    const isNextDynamicUsage =
      message.includes("Dynamic server usage") ||
      message.includes("cookies()") ||
      message.includes("headers()") ||
      message.includes("DYNAMIC_SERVER_USAGE") ||
      message.includes("HANGING_PROMISE_REJECTION") ||
      message.includes("During prerendering");

    if (isNextDynamicUsage) {
      return null;
    }

    console.error("[getCurrentUser] Unexpected error:", error);
    await logServerError({
      errorMessage: `Unexpected error in getCurrentUser: ${message || "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });
    return null;
  }
}

