/**
 * Core Accompagnement engine — turns a (enrollment, type) pair into a
 * DailyCheckIn row + answers + dispatched message.
 *
 * Used by:
 *   - /api/cron/daily-checkins (scheduled sends)
 *   - manual triggers from admin (future)
 */

import type { CheckInChannel, CheckInType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickQuestionsForCheckIn } from "./selection";
import { pickContextLine } from "./context-lines";
import { pickContextLineCategory } from "@/lib/ai/accompagnement";
import {
  buildCheckInUrl,
  buildShortCheckInUrl,
  sendCheckInMessage,
} from "@/lib/channels";
import { sendMakeWebhook } from "@/lib/webhooks/make";
import {
  formatInEasternTime,
  getEasternStartOfDay,
  getEasternEndOfDay,
} from "@/lib/utils/timezone";
import {
  pickPlanAwareContextLine,
  plannedChaptersFromHorizon,
} from "@/lib/accompagnement/plan-context-lines";
import { normalizePhoneToE164 } from "@/lib/utils/phone-e164";

export interface CreateAndSendCheckInResult {
  created: boolean;
  checkInId?: string;
  skippedReason?: string;
  error?: string;
}

export async function createAndSendCheckIn(params: {
  enrollmentId: string;
  type: CheckInType;
  isMissedReplacement?: boolean;
  now?: Date;
  /**
   * For local/testing: send via SMS (and record that channel on the check-in)
   * even if the enrollment is still set to email, or override the destination number.
   */
  dispatchOverride?: {
    channel: CheckInChannel;
    phoneE164?: string | null;
  };
}): Promise<CreateAndSendCheckInResult> {
  const now = params.now ?? new Date();

  const enrollment = await prisma.accompagnementEnrollment.findUnique({
    where: { id: params.enrollmentId },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      product: {
        include: {
          course: { select: { id: true, slug: true, title: true, code: true } },
        },
      },
      onboarding: { select: { examDate: true } },
    },
  });

  if (!enrollment) {
    return { created: false, error: "Enrollment not found" };
  }
  if (!enrollment.isActive) {
    return { created: false, skippedReason: "Enrollment inactive" };
  }
  if (!enrollment.onboardingCompleted) {
    return { created: false, skippedReason: "Onboarding not completed" };
  }
  if (enrollment.checkInsPaused) {
    return { created: false, skippedReason: "Check-ins paused" };
  }
  if (enrollment.expiresAt < now) {
    return { created: false, skippedReason: "Enrollment expired" };
  }

  const courseSlug = enrollment.product.course.slug;
  if (!courseSlug) {
    return { created: false, error: "Course missing slug" };
  }

  // Skip if we already created a check-in for this enrollment today (ET).
  const startOfDayEt = getEasternStartOfDay(now);
  const endOfDayEt = getEasternEndOfDay(now);
  const already = await prisma.dailyCheckIn.findFirst({
    where: {
      enrollmentId: enrollment.id,
      scheduledFor: { gte: startOfDayEt, lte: endOfDayEt },
    },
    select: { id: true },
  });
  if (already) {
    return {
      created: false,
      checkInId: already.id,
      skippedReason: "Already scheduled today",
    };
  }

  const effectiveChannel: CheckInChannel =
    params.dispatchOverride?.channel ?? enrollment.channel;
  let effectivePhoneE164: string | null = null;
  if (effectiveChannel === "SMS") {
    const rawPhone =
      params.dispatchOverride?.phoneE164 !== undefined
        ? params.dispatchOverride.phoneE164
        : enrollment.phoneE164;
    effectivePhoneE164 = normalizePhoneToE164(rawPhone ?? "");
    if (!effectivePhoneE164) {
      return {
        created: false,
        error:
          "Canal SMS : numéro manquant ou invalide. Utilise le format international (ex. +14165551234).",
      };
    }
  }

  // 1. Pick questions
  const picked = await pickQuestionsForCheckIn({
    enrollmentId: enrollment.id,
    courseSlug,
    type: params.type,
  });

  // 2. Pick context line (weekday index: 0 = Sun ... 6 = Sat in ET)
  const iso = parseInt(formatInEasternTime(now, "i"), 10); // 1=Mon..7=Sun
  const weekdayIndex = iso === 7 ? 0 : iso;

  const daysUntilExam = enrollment.onboarding?.examDate
    ? Math.ceil(
        (enrollment.onboarding.examDate.getTime() - now.getTime()) /
          (24 * 60 * 60 * 1000)
      )
    : null;

  const [plannedCount, weakCount] = await Promise.all([
    prisma.weeklyPlan.count({ where: { enrollmentId: enrollment.id } }),
    prisma.weakAreaSignal.count({
      where: {
        enrollmentId: enrollment.id,
        createdAt: {
          gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000),
        },
      },
    }),
  ]);

  const dateKeyEt = formatInEasternTime(now, "yyyy-MM-dd");
  const plannedFromHorizon = plannedChaptersFromHorizon(
    enrollment.studyPlanHorizon,
    now
  );
  const planAwareLine =
    !params.isMissedReplacement && plannedFromHorizon.length > 0
      ? pickPlanAwareContextLine({
          enrollmentId: enrollment.id,
          dateKey: dateKeyEt,
          plannedChapters: plannedFromHorizon,
        })
      : null;

  const category = pickContextLineCategory({
    isMissedReplacement: !!params.isMissedReplacement,
    daysUntilExam,
    hasWeakAreas: weakCount > 0,
    hasPlan: plannedCount > 0,
  });

  const contextLine = planAwareLine
    ? { body: planAwareLine.body, key: planAwareLine.key }
    : await pickContextLine({
        category,
        weekday: weekdayIndex,
        enrollmentId: enrollment.id,
      });

  // 3. Create DailyCheckIn + CheckInAnswer rows in a transaction
  const created = await prisma.$transaction(async (tx) => {
    const checkIn = await tx.dailyCheckIn.create({
      data: {
        enrollmentId: enrollment.id,
        type: params.type,
        scheduledFor: now,
        channel: effectiveChannel,
        contextLineKey: contextLine.key,
        contextLineBody: contextLine.body,
        status: "SCHEDULED",
      },
    });

    const answerRows: Prisma.CheckInAnswerCreateManyInput[] = [];
    picked.mcqs.forEach((q, i) => {
      answerRows.push({
        dailyCheckInId: checkIn.id,
        source: "MCQ",
        adaptiveQuestionId: q.id,
        adaptiveCourse: q.course,
        adaptiveChapter: q.chapter,
        adaptiveTopic: q.topic,
        orderIndex: i,
      });
    });
    picked.oeqs.forEach((q, i) => {
      answerRows.push({
        dailyCheckInId: checkIn.id,
        source: "OEQ",
        adaptiveQuestionId: q.id,
        adaptiveCourse: q.course,
        adaptiveChapter: q.chapter,
        adaptiveTopic: q.topic,
        orderIndex: picked.mcqs.length + i,
      });
    });

    if (answerRows.length > 0) {
      await tx.checkInAnswer.createMany({ data: answerRows });
    }

    return checkIn;
  });

  // 4. Dispatch on channel
  const checkInUrl = buildCheckInUrl(created.token);
  const shortUrl = buildShortCheckInUrl(created.token);
  const studentName =
    enrollment.user.firstName || enrollment.user.email.split("@")[0];

  const rawCourseLabel =
    enrollment.product.course.code?.trim() ||
    enrollment.product.course.slug?.trim() ||
    "";
  const courseCodeLabel = rawCourseLabel
    ? rawCourseLabel.toUpperCase()
    : null;

  const dispatch = await sendCheckInMessage({
    enrollmentId: enrollment.id,
    dailyCheckInId: created.id,
    type: params.type,
    channel: effectiveChannel,
    recipientEmail: enrollment.user.email,
    recipientName: studentName,
    recipientPhoneE164:
      effectiveChannel === "SMS" ? effectivePhoneE164 : null,
    checkInUrl,
    shortUrl,
    contextLine: contextLine.body,
    examDate: enrollment.onboarding?.examDate ?? null,
    courseCodeLabel,
  });

  // 5. Persist send result; clear nextCheckInOverride if consumed
  await prisma.$transaction(async (tx) => {
    await tx.dailyCheckIn.update({
      where: { id: created.id },
      data: {
        status: dispatch.success ? "SENT" : "SCHEDULED",
        sentAt: dispatch.success ? new Date() : null,
        providerMessageId: dispatch.providerMessageId,
      },
    });

    if (params.isMissedReplacement) {
      await tx.accompagnementEnrollment.update({
        where: { id: enrollment.id },
        data: { nextCheckInOverride: null },
      });
    }
  });

  if (dispatch.success) {
    sendMakeWebhook("checkin.sent" as any, {
      daily_check_in_id: created.id,
      enrollment_id: enrollment.id,
      student_email: enrollment.user.email,
      channel: effectiveChannel,
      type: params.type,
      sent_at: new Date().toISOString(),
    }).catch(() => {});
  }

  return {
    created: true,
    checkInId: created.id,
    ...(dispatch.success ? {} : { error: dispatch.error }),
  };
}

