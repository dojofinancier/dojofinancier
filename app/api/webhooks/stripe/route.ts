import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { prisma } from "@/lib/prisma";
import { createEnrollmentAction } from "@/app/actions/enrollments";
import { createCohortEnrollmentAction } from "@/app/actions/cohort-enrollments";
import { trackCouponUsageAction } from "@/app/actions/coupons";
import { logServerError } from "@/lib/utils/error-logging";
import { sendPaymentSuccessWebhook } from "@/lib/webhooks/make";
// User is already created during checkout, so we don't need to create it here

/**
 * Stripe webhook endpoint
 * Handles payment success and creates enrollment
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    await logServerError({
      errorMessage: `Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      stackTrace: err instanceof Error ? err.stack : undefined,
      severity: "HIGH",
    });

    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    // Handle payment intent succeeded
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;

      const {
        userId,
        courseId,
        cohortId,
        originalAmount,
        discountAmount,
        finalAmount,
        couponCode,
        couponId,
        type,
      } = paymentIntent.metadata;

      if (!userId || (!courseId && !cohortId)) {
        await logServerError({
          errorMessage: "Missing userId or courseId/cohortId in payment intent metadata",
          severity: "HIGH",
        });
        return NextResponse.json({ received: true });
      }

      const isCohortPayment = type === "cohort" || !!cohortId;
      const paymentType = isCohortPayment ? "cohort" : "course";
      const targetId = isCohortPayment ? cohortId : courseId;

      if (!targetId) {
        await logServerError({
          errorMessage: "Missing courseId or cohortId in payment intent metadata",
          severity: "HIGH",
        });
        return NextResponse.json({ received: true });
      }

      let enrollmentResult;
      let enrollmentId: string;

      if (isCohortPayment) {
        // Handle cohort enrollment
        const cohort = await prisma.cohort.findUnique({
          where: { id: cohortId! },
          select: { accessDuration: true },
        });

        if (!cohort) {
          await logServerError({
            errorMessage: `Cohort not found: ${cohortId}`,
            severity: "HIGH",
          });
          return NextResponse.json({ received: true });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + cohort.accessDuration);

        enrollmentResult = await createCohortEnrollmentAction({
          userId,
          cohortId: cohortId!,
          expiresAt,
          paymentIntentId: paymentIntent.id,
        });

        if (!enrollmentResult.success || !enrollmentResult.data) {
          await logServerError({
            errorMessage: `Failed to create cohort enrollment: ${enrollmentResult.error}`,
            severity: "CRITICAL",
          });
          return NextResponse.json({ received: true });
        }

        enrollmentId = enrollmentResult.data.id;
      } else {
        // Handle course enrollment
        const course = await prisma.course.findUnique({
          where: { id: courseId! },
          select: { accessDuration: true },
        });

        if (!course) {
          await logServerError({
            errorMessage: `Course not found: ${courseId}`,
            severity: "HIGH",
          });
          return NextResponse.json({ received: true });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + course.accessDuration);

        enrollmentResult = await createEnrollmentAction({
          userId,
          courseId: courseId!,
          expiresAt,
          paymentIntentId: paymentIntent.id,
        });

        if (!enrollmentResult.success || !enrollmentResult.data) {
          await logServerError({
            errorMessage: `Failed to create enrollment: ${enrollmentResult.error}`,
            severity: "CRITICAL",
          });
          return NextResponse.json({ received: true });
        }

        enrollmentId = enrollmentResult.data.id;

        // Track coupon usage if applicable (only for courses)
        if (couponId && enrollmentResult.data) {
          try {
            await trackCouponUsageAction(
              couponId,
              enrollmentResult.data.id,
              parseFloat(discountAmount || "0")
            );
          } catch (error) {
            // Log but don't fail enrollment
            await logServerError({
              errorMessage: `Failed to track coupon usage: ${error instanceof Error ? error.message : "Unknown error"}`,
              stackTrace: error instanceof Error ? error.stack : undefined,
              severity: "MEDIUM",
            });
          }
        }
      }

      // Fetch user and course/cohort details for webhook (non-blocking, fire-and-forget)
      // Don't await - let it run in the background without blocking the response
      // This ensures webhook fires for both new users (checkout) and logged-in users
      (async () => {
        try {
          // Fetch user details
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          });

          if (!user) {
            console.error("User not found for webhook:", userId);
            return;
          }

          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
          const userEmail = user.email;
          const userPhone = user.phone;

          // Fetch course or cohort title
          let courseTitle: string | null = null;
          let cohortTitle: string | null = null;

          if (isCohortPayment) {
            const cohort = await prisma.cohort.findUnique({
              where: { id: cohortId! },
              select: { title: true },
            });
            cohortTitle = cohort?.title || null;
          } else {
            const course = await prisma.course.findUnique({
              where: { id: courseId! },
              select: { title: true },
            });
            courseTitle = course?.title || null;
          }

          // Get enrollment to retrieve order_number
          let orderNumber: number | null = null;
          
          if (isCohortPayment) {
            const cohortEnrollment = await prisma.cohortEnrollment.findUnique({
              where: { id: enrollmentId },
              select: { orderNumber: true },
            }).catch(() => null);
            orderNumber = cohortEnrollment?.orderNumber || null;
          } else {
            const enrollment = await prisma.enrollment.findUnique({
              where: { id: enrollmentId },
              select: { orderNumber: true },
            }).catch(() => null);
            orderNumber = enrollment?.orderNumber || null;
          }

          sendPaymentSuccessWebhook({
            paymentIntentId: paymentIntent.id,
            userId,
            courseId: isCohortPayment ? undefined : courseId!,
            courseTitle: courseTitle,
            cohortId: isCohortPayment ? cohortId! : undefined,
            cohortTitle: cohortTitle,
            enrollmentId,
            orderNumber,
            amount: parseFloat(finalAmount || "0"), // Amount in dollars
            originalAmount: parseFloat(originalAmount || "0"), // Amount in dollars
            discountAmount: parseFloat(discountAmount || "0"), // Amount in dollars
            couponCode: couponCode || null,
            type: paymentType as "course" | "cohort",
            userName: userName,
            userEmail: userEmail,
            userPhone: userPhone,
            timestamp: new Date().toISOString(),
          }).catch((error) => {
            // Silently fail - webhook is not critical for UX
            console.error("Failed to send payment webhook:", error);
          });
        } catch (error) {
          // Silently fail - webhook is not critical for UX
          console.error("Failed to fetch user/course/cohort data for webhook:", error);
        }
      })();

      return NextResponse.json({ received: true });
    }

    // Handle other event types as needed
    return NextResponse.json({ received: true });
  } catch (error) {
    await logServerError({
      errorMessage: `Webhook processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "CRITICAL",
    });

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

