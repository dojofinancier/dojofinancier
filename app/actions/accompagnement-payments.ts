"use server";

import type { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import {
  createAccompagnementPaymentIntentForUser,
  createAccompagnementEnrollment,
  userHasActiveEnrollmentInCourse,
  createAccompagnementPaymentIntentSchema,
  type AccompagnementPaymentResult,
} from "@/lib/accompagnement/payment-flow";

export { userHasActiveEnrollmentInCourse };
export type { AccompagnementPaymentResult };

/**
 * Create a PaymentIntent for a one-time accompagnement product purchase.
 */
export async function createAccompagnementPaymentIntentAction(
  data: z.infer<typeof createAccompagnementPaymentIntentSchema>,
  userId?: string
): Promise<AccompagnementPaymentResult> {
  let resolvedUserId: string;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: "Utilisateur introuvable" };
    }
    resolvedUserId = user.id;
  } else {
    const user = await requireAuth();
    resolvedUserId = user.id;
  }

  return createAccompagnementPaymentIntentForUser(resolvedUserId, data);
}

/**
 * Confirm accompagnement payment and create enrollment.
 * Called from Stripe webhook or as a fallback from the frontend.
 */
export async function createAccompagnementEnrollmentAction(data: {
  userId: string;
  accompagnementProductId: string;
  paymentIntentId: string;
}): Promise<AccompagnementPaymentResult> {
  return createAccompagnementEnrollment(data);
}
