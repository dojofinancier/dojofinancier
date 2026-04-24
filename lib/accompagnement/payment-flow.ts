import { stripe } from "@/lib/stripe/server";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/utils/error-logging";
import { z } from "zod";

export const createAccompagnementPaymentIntentSchema = z.object({
  accompagnementProductId: z.string().min(1),
  couponCode: z.string().optional().nullable(),
});

/** Active course enrollment (same rule as getAccompagnementStatusAction). */
export async function userHasActiveEnrollmentInCourse(
  userId: string,
  courseId: string
): Promise<boolean> {
  const row = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId,
      expiresAt: { gte: new Date() },
    },
    select: { id: true },
  });
  return !!row;
}

export type AccompagnementPaymentResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Create a PaymentIntent for a one-time accompagnement product purchase.
 */
export async function createAccompagnementPaymentIntentForUser(
  userId: string,
  data: z.infer<typeof createAccompagnementPaymentIntentSchema>
): Promise<AccompagnementPaymentResult> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    const validatedData = createAccompagnementPaymentIntentSchema.parse(data);

    const product = await prisma.accompagnementProduct.findUnique({
      where: { id: validatedData.accompagnementProductId },
      include: { course: { select: { id: true, title: true } } },
    });

    if (!product) {
      return { success: false, error: "Produit d'accompagnement introuvable" };
    }

    if (!product.published) {
      return {
        success: false,
        error: "Ce produit d'accompagnement n'est pas encore disponible",
      };
    }

    const eligible = await userHasActiveEnrollmentInCourse(
      user.id,
      product.courseId
    );
    if (!eligible) {
      return {
        success: false,
        error:
          "L'accompagnement est réservé aux étudiants inscrits à la formation associée",
      };
    }

    const existingEnrollment =
      await prisma.accompagnementEnrollment.findFirst({
        where: {
          userId: user.id,
          accompagnementProductId: validatedData.accompagnementProductId,
          expiresAt: { gte: new Date() },
          isActive: true,
        },
      });

    if (existingEnrollment) {
      return {
        success: false,
        error: "Vous êtes déjà inscrit à ce programme d'accompagnement",
      };
    }

    const amount = Number(product.price);
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "cad",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        type: "accompagnement",
        accompagnementProductId: product.id,
        userId: user.id,
        courseId: product.courseId,
        originalAmount: amount.toString(),
        finalAmount: amount.toString(),
        discountAmount: "0",
      },
    });

    return {
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        productTitle: product.title,
        courseTitle: product.course.title,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to create accompagnement payment intent: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      userId,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Une erreur est survenue lors de la création du paiement",
    };
  }
}

/**
 * Confirm accompagnement payment and create enrollment.
 * Called from Stripe webhook or from the API route after client-side payment.
 */
export async function createAccompagnementEnrollment(data: {
  userId: string;
  accompagnementProductId: string;
  paymentIntentId: string;
}): Promise<AccompagnementPaymentResult> {
  try {
    const existing = await prisma.accompagnementEnrollment.findFirst({
      where: { paymentIntentId: data.paymentIntentId },
      select: { id: true },
    });

    if (existing) {
      return { success: true, data: existing };
    }

    const product = await prisma.accompagnementProduct.findUnique({
      where: { id: data.accompagnementProductId },
    });

    if (!product) {
      return { success: false, error: "Produit d'accompagnement introuvable" };
    }

    const eligible = await userHasActiveEnrollmentInCourse(
      data.userId,
      product.courseId
    );
    if (!eligible) {
      return {
        success: false,
        error:
          "Inscription au cours requise pour finaliser l'accompagnement (webhook)",
      };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + product.accessDurationDays);

    const lastOrder = await prisma.accompagnementEnrollment.findFirst({
      where: { orderNumber: { not: null } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const nextOrderNumber = (lastOrder?.orderNumber ?? 9999) + 1;

    const enrollment = await prisma.accompagnementEnrollment.create({
      data: {
        userId: data.userId,
        accompagnementProductId: data.accompagnementProductId,
        paymentIntentId: data.paymentIntentId,
        orderNumber: nextOrderNumber,
        expiresAt,
        onboardingCompleted: false,
        isActive: true,
      },
    });

    return { success: true, data: enrollment };
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "P2002") {
      const existing = await prisma.accompagnementEnrollment.findFirst({
        where: { paymentIntentId: data.paymentIntentId },
        select: { id: true },
      });
      return { success: true, data: existing };
    }

    await logServerError({
      errorMessage: `Failed to create accompagnement enrollment: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "CRITICAL",
    });

    return {
      success: false,
      error: "Erreur lors de la création de l'inscription",
    };
  }
}
