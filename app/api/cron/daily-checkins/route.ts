import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAndSendCheckIn } from "@/lib/accompagnement/engine";
import {
  getCheckInTypeForDate,
  getCurrentEasternHour,
} from "@/lib/accompagnement/schedule";
import type { CheckInType } from "@prisma/client";

/**
 * Hourly daily-checkin cron.
 *
 * On every tick:
 *   1. Compute the current hour in ET.
 *   2. Find active enrollments whose product.sendTime matches this hour.
 *   3. For each enrollment:
 *        - If `nextCheckInOverride` is set (from the missed-day job), send
 *          a MISSED-style check-in and clear the override.
 *        - Otherwise send the weekday-default check-in type.
 *
 * Secret: `?secret=<CRON_SECRET>` or `Authorization: Bearer <CRON_SECRET>`
 * (Vercel Cron sends the bearer header automatically).
 */
export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentHour = getCurrentEasternHour(now);
  const hourKey = `${currentHour.toString().padStart(2, "0")}:`;

  try {
    const enrollments = await prisma.accompagnementEnrollment.findMany({
      where: {
        isActive: true,
        onboardingCompleted: true,
        checkInsPaused: false,
        expiresAt: { gte: now },
        product: {
          published: true,
          sendTime: { startsWith: hourKey },
        },
      },
      select: {
        id: true,
        nextCheckInOverride: true,
      },
    });

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    const defaultType: CheckInType = getCheckInTypeForDate(now);

    for (const enrollment of enrollments) {
      const isMissed = enrollment.nextCheckInOverride === "MISSED";
      const type: CheckInType = isMissed ? "MISSED" : defaultType;

      try {
        const result = await createAndSendCheckIn({
          enrollmentId: enrollment.id,
          type,
          isMissedReplacement: isMissed,
          now,
        });

        if (result.created) {
          sent++;
        } else if (result.error) {
          errors.push(`Enrollment ${enrollment.id}: ${result.error}`);
        } else {
          skipped++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Enrollment ${enrollment.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      hourKey,
      defaultType,
      sent,
      skipped,
      total: enrollments.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Daily check-in cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

function verifyCronAuth(request: NextRequest): { ok: boolean } {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false };
  const queryParam = request.nextUrl.searchParams.get("secret");
  if (queryParam === secret) return { ok: true };
  const header = request.headers.get("authorization");
  if (header && header === `Bearer ${secret}`) return { ok: true };
  return { ok: false };
}
