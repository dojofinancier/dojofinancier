"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { validateCouponAction, applyCouponDiscountAction } from "@/app/actions/coupons";
import { logServerError } from "@/lib/utils/error-logging";
import { getEasternNow } from "@/lib/utils/timezone";

export type CartActionResult = {
  success: boolean;
  error?: string;
  data?: any;
};

/**
 * Add course or cohort to cart
 * Note: In this implementation, cart is ephemeral (stored in localStorage client-side)
 * This action validates the course/cohort can be added
 */
export async function addCourseToCartAction(courseId: string): Promise<CartActionResult> {
  try {
    const user = await requireAuth();

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { category: true },
    });

    if (!course) {
      return {
        success: false,
        error: "Cours introuvable",
      };
    }

    if (!course.published) {
      return {
        success: false,
        error: "Ce cours n'est pas encore disponible",
      };
    }

    if (course.paymentType === "SUBSCRIPTION") {
      return {
        success: false,
        error: "Les abonnements ne sont pas encore disponibles",
      };
    }

    // Check if user already has active enrollment
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId,
        expiresAt: {
          gte: getEasternNow(), // Use Eastern Time for expiration checks
        },
      },
    });

    if (existingEnrollment) {
      return {
        success: false,
        error: "Vous êtes déjà inscrit à ce cours",
      };
    }

    return {
      success: true,
      data: {
        courseId: course.id,
        title: course.title,
        description: course.description,
        price: Number(course.price),
        category: course.category.name,
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to add to cart: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de l'ajout au panier",
    };
  }
}

/**
 * Add cohort to cart
 */
export async function addCohortToCartAction(cohortId: string): Promise<CartActionResult> {
  try {
    const user = await requireAuth();

    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        price: true,
        published: true,
        enrollmentClosingDate: true,
      },
    });

    if (!cohort) {
      return {
        success: false,
        error: "Cohorte introuvable",
      };
    }

    if (!cohort.published) {
      return {
        success: false,
        error: "Cette cohorte n'est pas encore disponible",
      };
    }

    // Check if enrollment is still open
    const easternNow = getEasternNow();
    if (cohort.enrollmentClosingDate < easternNow) {
      return {
        success: false,
        error: "Les inscriptions pour cette cohorte sont fermées",
      };
    }

    // Check if user already has active enrollment
    const existingEnrollment = await prisma.cohortEnrollment.findFirst({
      where: {
        userId: user.id,
        cohortId,
        expiresAt: {
          gte: easternNow,
        },
      },
    });

    if (existingEnrollment) {
      return {
        success: false,
        error: "Vous êtes déjà inscrit à cette cohorte",
      };
    }

    return {
      success: true,
      data: {
        cohortId: cohort.id,
        slug: cohort.slug,
        title: cohort.title,
        description: cohort.description,
        price: Number(cohort.price),
      },
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to add cohort to cart: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de l'ajout au panier",
    };
  }
}

/**
 * Validate coupon code for cart
 */
export async function validateCartCouponAction(
  couponCode: string,
  courseId: string
): Promise<CartActionResult> {
  try {
    // Coupon validation works for both authenticated and unauthenticated users
    const validation = await validateCouponAction(couponCode, courseId);

    if (!validation.success || !validation.data) {
      return validation;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { price: true },
    });

    if (!course) {
      return {
        success: false,
        error: "Cours introuvable",
      };
    }

    const discountResult = await applyCouponDiscountAction(
      couponCode,
      Number(course.price),
      courseId
    );

    return discountResult;
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to validate cart coupon: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de la validation du coupon",
    };
  }
}


