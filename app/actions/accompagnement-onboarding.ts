"use server";

import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/utils/error-logging";
import { sendMakeWebhook } from "@/lib/webhooks/make";
import { sendOnboardingWelcomeEmailAndLog } from "@/lib/accompagnement/onboarding-email";
import { regenerateAccompagnementStudyPlan } from "@/lib/accompagnement/study-plan";
import { normalizePhoneToE164 } from "@/lib/utils/phone-e164";
import { EASTERN_TIMEZONE } from "@/lib/utils/timezone";
import { z } from "zod";

const chapterAssessmentSchema = z.object({
  chapter: z.number().int().min(0).max(999),
  topic: z.string().nullable().optional(),
  status: z.enum(["NOT_STARTED", "READ_LOW", "READ_SOMEWHAT", "READ_CONFIDENT"]),
});

const onboardingSchema = z.object({
  enrollmentId: z.string().min(1),
  examDate: z.string().nullable(),
  studyHoursPerWeek: z.number().min(1).max(60),
  channel: z.enum(["EMAIL", "SMS"]),
  /** Raw input; normalized server-side with `normalizePhoneToE164` when channel is SMS. */
  phoneE164: z.string().nullable().optional(),
  additionalNotes: z.string().optional().nullable(),
  chapterAssessments: z.array(chapterAssessmentSchema).min(1),
});

export type OnboardingResult = {
  success: boolean;
  error?: string;
};

export async function submitOnboardingAction(
  data: z.infer<typeof onboardingSchema>
): Promise<OnboardingResult> {
  try {
    const user = await requireAuth();
    const validated = onboardingSchema.parse(data);
    const examDateRaw = validated.examDate?.trim() || null;

    if (examDateRaw) {
      const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateOnlyPattern.test(examDateRaw)) {
        return {
          success: false,
          error: "Date d'examen invalide.",
        };
      }

      const todayEt = new Intl.DateTimeFormat("en-CA", {
        timeZone: EASTERN_TIMEZONE,
      }).format(new Date());

      if (examDateRaw < todayEt) {
        return {
          success: false,
          error: "La date d'examen ne peut pas etre dans le passe.",
        };
      }
    }

    let phoneE164: string | null = null;
    if (validated.channel === "SMS") {
      phoneE164 = normalizePhoneToE164((validated.phoneE164 ?? "").trim());
      if (!phoneE164) {
        return {
          success: false,
          error:
            "Pour le SMS, saisis un numéro valide au format international (ex. +14165551234) ou 10 chiffres pour l’Amérique du Nord.",
        };
      }
    }

    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: {
        id: validated.enrollmentId,
        userId: user.id,
        isActive: true,
      },
    });

    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }

    const examDate = examDateRaw ? new Date(examDateRaw) : null;

    await prisma.$transaction(async (tx) => {
      // Upsert the onboarding parent
      const onboarding = await tx.accompagnementOnboarding.upsert({
        where: { enrollmentId: validated.enrollmentId },
        create: {
          enrollmentId: validated.enrollmentId,
          examDate,
          studyHoursPerWeek: validated.studyHoursPerWeek,
          additionalNotes: validated.additionalNotes || null,
        },
        update: {
          examDate,
          studyHoursPerWeek: validated.studyHoursPerWeek,
          additionalNotes: validated.additionalNotes || null,
        },
      });

      // Replace chapter self-assessments
      await tx.chapterSelfAssessment.deleteMany({
        where: { onboardingId: onboarding.id },
      });
      await tx.chapterSelfAssessment.createMany({
        data: validated.chapterAssessments.map((c) => ({
          onboardingId: onboarding.id,
          chapter: c.chapter,
          topic: c.topic ?? null,
          status: c.status,
        })),
      });

      // Seed weak-area signals for READ_LOW / NOT_STARTED chapters so the
      // selection engine has something to work with on day 1.
      await tx.weakAreaSignal.deleteMany({
        where: {
          enrollmentId: validated.enrollmentId,
          signalType: "SELF_LOW_CONF",
        },
      });
      const seedSignals = validated.chapterAssessments.filter(
        (c) => c.status === "NOT_STARTED" || c.status === "READ_LOW"
      );
      if (seedSignals.length > 0) {
        await tx.weakAreaSignal.createMany({
          data: seedSignals.map((c) => ({
            enrollmentId: validated.enrollmentId,
            chapter: c.chapter,
            topic: c.topic ?? "",
            signalType: "SELF_LOW_CONF" as const,
          })),
        });
      }

      // Update enrollment-level fields
      await tx.accompagnementEnrollment.update({
        where: { id: validated.enrollmentId },
        data: {
          channel: validated.channel,
          phoneE164,
          onboardingCompleted: true,
        },
      });
    });

    const studyPlanResult = await regenerateAccompagnementStudyPlan(
      validated.enrollmentId
    );
    if (studyPlanResult.error) {
      await logServerError({
        errorMessage: `Study plan after onboarding: ${studyPlanResult.error}`,
        severity: "MEDIUM",
      });
    }

    sendMakeWebhook("accompagnement.onboarding.completed" as any, {
      enrollment_id: validated.enrollmentId,
      user_id: user.id,
      user_email: user.email,
      exam_date: examDate?.toISOString() || null,
      study_hours_per_week: validated.studyHoursPerWeek,
      channel: validated.channel,
      chapter_count: validated.chapterAssessments.length,
      completed_at: new Date().toISOString(),
    }).catch(() => {});

    const weakChapterLines = validated.chapterAssessments
      .filter(
        (c) => c.status === "NOT_STARTED" || c.status === "READ_LOW"
      )
      .map((c) =>
        c.topic?.trim() ? c.topic.trim() : `Chapitre ${c.chapter}`
      );

    const displayName =
      user.firstName?.trim() ||
      user.email.split("@")[0] ||
      "Bonjour";

    void sendOnboardingWelcomeEmailAndLog({
      enrollmentId: validated.enrollmentId,
      recipientEmail: user.email,
      recipientName: displayName,
      weakChapterLines,
    }).then((r) => {
      if (!r.ok && r.error) {
        console.error(
          "[accompagnement onboarding] Welcome email failed:",
          r.error
        );
      }
    });

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Failed to submit onboarding: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "HIGH",
    });

    return {
      success: false,
      error: "Une erreur est survenue lors de l'enregistrement",
    };
  }
}

/**
 * Server loader used by the onboarding form to prefill chapter rows.
 */
export async function loadCourseChaptersAction(
  enrollmentId: string
): Promise<
  | {
      success: true;
      chapters: Array<{ order: number; title: string }>;
      suggestedPhoneE164: string | null;
    }
  | { success: false; error: string }
> {
  try {
    const user = await requireAuth();
    const enrollment = await prisma.accompagnementEnrollment.findFirst({
      where: { id: enrollmentId, userId: user.id },
      select: {
        phoneE164: true,
        user: { select: { phone: true } },
        product: {
          select: {
            course: {
              select: {
                modules: {
                  select: { order: true, title: true },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
    });
    if (!enrollment) {
      return { success: false, error: "Inscription introuvable" };
    }
    const suggestedPhoneE164 =
      enrollment.phoneE164 ??
      normalizePhoneToE164(enrollment.user.phone ?? "");
    return {
      success: true,
      chapters: enrollment.product.course.modules.map((m) => ({
        order: m.order,
        title: m.title,
      })),
      suggestedPhoneE164,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur",
    };
  }
}
