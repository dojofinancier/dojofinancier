import { prisma } from "@/lib/prisma";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Syncs Supabase Auth user with Prisma User table
 * Creates user record if it doesn't exist
 */
export async function syncUserFromSupabase(
  supabaseUser: SupabaseUser,
  firstName: string | null = null,
  lastName: string | null = null,
  phone: string | null = null
) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (existingUser) {
      // Update existing user with new information if provided
      if (firstName || lastName || phone) {
        return await prisma.user.update({
          where: { supabaseId: supabaseUser.id },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(phone && { phone }),
          },
        });
      }
      return existingUser;
    }

    // Create new user record
    const newUser = await prisma.user.create({
      data: {
        supabaseId: supabaseUser.id,
        email: supabaseUser.email!,
        role: "STUDENT", // Default role
        firstName: firstName || supabaseUser.user_metadata?.first_name || null,
        lastName: lastName || supabaseUser.user_metadata?.last_name || null,
        phone: phone || null,
      },
    });

    return newUser;
  } catch (error) {
    console.error("Error syncing user from Supabase:", error);
    throw error;
  }
}

/**
 * Gets Prisma user from Supabase user ID
 */
export async function getUserFromSupabaseId(supabaseId: string) {
  return await prisma.user.findUnique({
    where: { supabaseId },
  });
}

