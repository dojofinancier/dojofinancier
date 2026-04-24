"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-auth";
import { logServerError } from "@/lib/utils/error-logging";

export type AccompagnementAdminResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Immediately end an accompagnement enrollment (admin).
 * Sets inactive, expires now, and pauses check-ins so cron skips the row.
 */
export async function cancelAccompagnementEnrollmentAdminAction(input: {
  enrollmentId: string;
  studentUserId: string;
}): Promise<AccompagnementAdminResult> {
  try {
    await requireAdmin();

    const row = await prisma.accompagnementEnrollment.findFirst({
      where: {
        id: input.enrollmentId,
        userId: input.studentUserId,
      },
      select: { id: true },
    });

    if (!row) {
      return { success: false, error: "Inscription à l'accompagnement introuvable." };
    }

    const now = new Date();
    await prisma.accompagnementEnrollment.update({
      where: { id: input.enrollmentId },
      data: {
        isActive: false,
        expiresAt: now,
        checkInsPaused: true,
      },
    });

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Admin cancel accompagnement enrollment failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });
    return { success: false, error: "Impossible d'annuler cette inscription." };
  }
}
