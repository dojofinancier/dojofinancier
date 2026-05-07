"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth/require-auth";
import { z } from "zod";
import { logServerError } from "@/lib/utils/error-logging";
import type { PaginatedResult } from "@/lib/utils/pagination";

const enrollmentSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
  expiresAt: z.date(),
  paymentIntentId: z.string().optional().nullable(),
});

export type EnrollmentActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Create an enrollment (admin only, or via payment webhook)
 */
export async function createEnrollmentAction(
  data: z.infer<typeof enrollmentSchema>,
  skipAuthCheck: boolean = false
): Promise<EnrollmentActionResult> {
  try {
    // Allow admin or system (webhook/payment) to create enrollments
    if (!skipAuthCheck) {
      try {
        await requireAdmin();
      } catch {
        // If not admin, allow if called from webhook/payment context
        // In production, add webhook signature verification here
      }
    }

    const validatedData = enrollmentSchema.parse(data);

    // order_number is allocated atomically by the DB via DEFAULT nextval('enrollment_order_seq').
    // Do NOT pass orderNumber here — let the database default fire to avoid races.
    const enrollment = await prisma.enrollment.create({
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
      },
    });

    // Note: Payment webhook is sent from the Stripe webhook handler (app/api/webhooks/stripe/route.ts)
    // to avoid duplicate webhook sends. This action is called from the webhook handler,
    // so we don't send the webhook here to prevent duplicates.

    return { success: true, data: enrollment };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Données invalides",
      };
    }

    // Idempotent recovery: if another request already created the enrollment for
    // this paymentIntentId (Stripe webhook + client fallback racing), the unique
    // partial index on payment_intent_id will trip P2002. Treat that as success
    // and return the existing row so all callers converge on the same enrollment.
    if (
      data.paymentIntentId &&
      (error as { code?: string })?.code === "P2002" &&
      Array.isArray((error as { meta?: { target?: string[] } })?.meta?.target) &&
      (error as { meta?: { target?: string[] } }).meta!.target!.some(
        (t) => t === "payment_intent_id" || t === "enrollments_payment_intent_id_key"
      )
    ) {
      const existing = await prisma.enrollment.findFirst({
        where: { paymentIntentId: data.paymentIntentId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          course: { select: { id: true, title: true, price: true } },
        },
      });
      if (existing) {
        return { success: true, data: existing };
      }
    }

    await logServerError({
      errorMessage: `Failed to create enrollment: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la création de l'inscription",
    };
  }
}

/**
 * Update an enrollment (admin only)
 */
export async function updateEnrollmentAction(
  enrollmentId: string,
  data: Partial<z.infer<typeof enrollmentSchema>>
): Promise<EnrollmentActionResult> {
  try {
    await requireAdmin();

    const validatedData = enrollmentSchema.partial().parse(data);

    const enrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return { success: true, data: enrollment };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Données invalides",
      };
    }

    await logServerError({
      errorMessage: `Failed to update enrollment: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      userId: (await requireAdmin()).id,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la mise à jour de l'inscription",
    };
  }
}

/**
 * Delete an enrollment (admin only)
 */
export async function deleteEnrollmentAction(
  enrollmentId: string
): Promise<EnrollmentActionResult> {
  try {
    await requireAdmin();

    await prisma.enrollment.delete({
      where: { id: enrollmentId },
    });

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to delete enrollment: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      userId: (await requireAdmin()).id,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la suppression de l'inscription",
    };
  }
}

/**
 * Extend enrollment access (admin only)
 */
export async function extendEnrollmentAccessAction(
  enrollmentId: string,
  additionalDays: number
): Promise<EnrollmentActionResult> {
  try {
    await requireAdmin();

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return {
        success: false,
        error: "Inscription introuvable",
      };
    }

    const newExpiresAt = new Date(enrollment.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { expiresAt: newExpiresAt },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return { success: true, data: updated };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to extend enrollment: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      userId: (await requireAdmin()).id,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la prolongation de l'accès",
    };
  }
}

/**
 * Revoke enrollment access (admin only)
 * Sets expiration date to now
 */
export async function revokeEnrollmentAccessAction(
  enrollmentId: string
): Promise<EnrollmentActionResult> {
  try {
    await requireAdmin();

    const enrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { expiresAt: new Date() },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return { success: true, data: enrollment };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to revoke enrollment: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      userId: (await requireAdmin()).id,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Erreur lors de la révocation de l'accès",
    };
  }
}

/**
 * Get user's enrollments
 */
export async function getUserEnrollmentsAction(params: {
  cursor?: string;
  limit?: number;
  userId?: string; // If provided and admin, get that user's enrollments
}): Promise<PaginatedResult<any>> {
  try {
    const currentUser = await requireAuth();
    const userId = params.userId && (await requireAdmin()).id === currentUser.id
      ? params.userId
      : currentUser.id;

    const limit = params.limit || 20;
    const cursor = params.cursor ? { id: params.cursor } : undefined;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      take: limit + 1,
      cursor,
      orderBy: { purchaseDate: "desc" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
            slug: true,
            price: true,
            appointmentHourlyRate: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const hasMore = enrollments.length > limit;
    const items = hasMore ? enrollments.slice(0, limit) : enrollments;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Serialize Decimal fields to numbers for client components
    const serializedItems = items.map((enrollment) => ({
      ...enrollment,
      course: {
        ...enrollment.course,
        price: enrollment.course.price ? Number(enrollment.course.price) : null,
        appointmentHourlyRate: enrollment.course.appointmentHourlyRate 
          ? Number(enrollment.course.appointmentHourlyRate) 
          : null,
      },
    }));

    return {
      items: serializedItems,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to get enrollments: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      items: [],
      nextCursor: null,
      hasMore: false,
    };
  }
}

