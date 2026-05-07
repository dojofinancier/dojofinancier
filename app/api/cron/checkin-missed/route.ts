import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/security/request-secrets";
import { prisma } from "@/lib/prisma";
import { sendMakeWebhook } from "@/lib/webhooks/make";

/**
 * Missed-check-in detection cron.
 *
 * Runs daily around 06:30 ET (just before the 07:00 ET send window).
 *
 * For each enrollment, inspects the most recent SCHEDULED/SENT check-in:
 *   - If older than 20h and not RESPONDED → mark as MISSED.
 *   - Sets `enrollment.nextCheckInOverride = MISSED` so the next daily
 *     send uses the MISSED format (acknowledging the miss with a simple
 *     restart nudge) rather than the weekday-default type.
 */
export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 20);

    const missedCheckIns = await prisma.dailyCheckIn.findMany({
      where: {
        status: { in: ["SENT", "SCHEDULED"] },
        scheduledFor: { lt: cutoff },
        enrollment: { checkInsPaused: false },
      },
      include: {
        enrollment: {
          select: {
            id: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    if (missedCheckIns.length === 0) {
      return NextResponse.json({ success: true, updated: 0, overridden: 0 });
    }

    await prisma.dailyCheckIn.updateMany({
      where: { id: { in: missedCheckIns.map((ci) => ci.id) } },
      data: { status: "MISSED" },
    });

    // Flag each enrollment so the next daily send uses MISSED format.
    const enrollmentIds = Array.from(
      new Set(missedCheckIns.map((ci) => ci.enrollmentId))
    );
    const overridden = await prisma.accompagnementEnrollment.updateMany({
      where: { id: { in: enrollmentIds } },
      data: { nextCheckInOverride: "MISSED" },
    });

    for (const ci of missedCheckIns) {
      sendMakeWebhook("checkin.missed" as any, {
        daily_check_in_id: ci.id,
        enrollment_id: ci.enrollmentId,
        student_email: ci.enrollment.user.email,
        scheduled_for: ci.scheduledFor.toISOString(),
        marked_missed_at: new Date().toISOString(),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      updated: missedCheckIns.length,
      overridden: overridden.count,
    });
  } catch (error) {
    console.error("Missed check-in cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
