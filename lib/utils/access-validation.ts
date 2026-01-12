import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export type AccessValidationResult = {
  hasAccess: boolean;
  reason?: string;
  expiresAt?: Date;
  enrollmentId?: string;
  subscriptionId?: string;
};

/**
 * Validates if a user has access to a course
 * Checks: enrollment expiration, subscription status, course published status, user suspension
 */
export async function validateCourseAccess(
  userId: string,
  courseId: string
): Promise<AccessValidationResult> {
  try {
    // Check if user is suspended
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { suspendedAt: true },
    });

    if (user?.suspendedAt) {
      return {
        hasAccess: false,
        reason: "Votre compte a été suspendu",
      };
    }

    // Check if course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { published: true, paymentType: true, subscriptionId: true },
    });

    if (!course) {
      return {
        hasAccess: false,
        reason: "Cours introuvable",
      };
    }

    if (!course.published) {
      return {
        hasAccess: false,
        reason: "Ce cours n'est pas encore publié",
      };
    }

    // Check enrollment for one-time purchases
    if (course.paymentType === "ONE_TIME") {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          courseId,
          expiresAt: {
            gte: new Date(), // Not expired
          },
        },
        orderBy: { expiresAt: "desc" },
      });

      if (!enrollment) {
        return {
          hasAccess: false,
          reason: "Vous n'êtes pas inscrit à ce cours ou votre accès a expiré",
        };
      }

      return {
        hasAccess: true,
        expiresAt: enrollment.expiresAt,
        enrollmentId: enrollment.id,
      };
    }

    // Check subscription for subscription-based courses
    if (course.paymentType === "SUBSCRIPTION" && course.subscriptionId) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          stripeSubscriptionId: course.subscriptionId,
          currentPeriodEnd: {
            gte: new Date(), // Not expired
          },
        },
      });

      if (!subscription) {
        return {
          hasAccess: false,
          reason: "Votre abonnement n'est pas actif ou a expiré",
        };
      }

      return {
        hasAccess: true,
        expiresAt: subscription.currentPeriodEnd,
        subscriptionId: subscription.id,
      };
    }

    return {
      hasAccess: false,
      reason: "Type de paiement non supporté",
    };
  } catch (error) {
    console.error("Error validating course access:", error);
    return {
      hasAccess: false,
      reason: "Erreur lors de la vérification de l'accès",
    };
  }
}

/**
 * Validates if a user has access to a content item
 * Requires access to the parent course
 */
export async function validateContentAccess(
  userId: string,
  contentItemId: string
): Promise<AccessValidationResult> {
  try {
    // Get the content item's module and course
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: contentItemId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!contentItem) {
      return {
        hasAccess: false,
        reason: "Contenu introuvable",
      };
    }

    // Validate course access
    return await validateCourseAccess(userId, contentItem.module.courseId);
  } catch (error) {
    console.error("Error validating content access:", error);
    return {
      hasAccess: false,
      reason: "Erreur lors de la vérification de l'accès",
    };
  }
}

