"use server";

import { createClient } from "@/lib/supabase/server";
import { syncUserFromSupabase } from "@/lib/auth/user-sync";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AuthActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Get current user info (for client components)
 */
export async function getCurrentUserInfoAction() {
  try {
    const { getCurrentUser } = await import("@/lib/auth/get-current-user");
    const user = await getCurrentUser();
    
    if (!user) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("Get current user info error:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des informations utilisateur",
    };
  }
}

/**
 * Login with email and password
 */
export async function loginAction(
  email: string,
  password: string
): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (data.user) {
      // Sync user to Prisma
      await syncUserFromSupabase(data.user);
      revalidatePath("/", "layout");
    }

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la connexion",
    };
  }
}

/**
 * Logout
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  // Don't redirect here - let the component handle it
}

/**
 * Request password reset
 */
export async function resetPasswordAction(
  email: string
): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reset-password/confirm`,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la demande de réinitialisation",
    };
  }
}

/**
 * Update password (after reset)
 */
export async function updatePasswordAction(
  password: string
): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Update password error:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la mise à jour du mot de passe",
    };
  }
}

