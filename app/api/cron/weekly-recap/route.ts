import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/security/request-secrets";
import { prisma } from "@/lib/prisma";
import {
  buildWeeklyRecapEmail,
  sendWeeklyRecapEmail,
} from "@/lib/channels/email";
import { sendMakeWebhook } from "@/lib/webhooks/make";
import { generateWeeklyReviewAndPlan } from "@/lib/accompagnement/weekly";
import {
  getEasternWeekStart,
  getCurrentEasternHour,
} from "@/lib/accompagnement/schedule";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Weekly recap cron. Runs Sundays at 19:00 ET.
 *
 * For every active enrollment:
 *   - aggregates last 7 days of check-ins (Sun→Sat),
 *   - upserts a WeeklyReview (with AI summary) + next-week WeeklyPlan,
 *   - emails the recap,
 *   - logs to WeeklyEmailLog.
 */
export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Week that just ended: Sunday now → previous Sunday 00:00 ET to Sat 23:59
  const thisWeekStart = getEasternWeekStart(now); // Sun this week 00:00 ET
  const lastWeekEnd = new Date(thisWeekStart.getTime() - 1); // Sat 23:59 ET
  const lastWeekStart = new Date(
    thisWeekStart.getTime() - 7 * 24 * 3600 * 1000
  );

  // If the cron is invoked outside Sunday evening by accident, we still
  // allow it — the hour check is advisory only.
  const currentHour = getCurrentEasternHour(now);

  try {
    const enrollments = await prisma.accompagnementEnrollment.findMany({
      where: {
        isActive: true,
        onboardingCompleted: true,
        expiresAt: { gte: now },
      },
      include: {
        user: { select: { email: true, firstName: true } },
        product: { select: { aiModel: true } },
        onboarding: { select: { examDate: true } },
      },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const enrollment of enrollments) {
      try {
        // Skip if we already logged a recap for this week.
        const existing = await prisma.weeklyEmailLog.findFirst({
          where: {
            enrollmentId: enrollment.id,
            weekStartDate: lastWeekStart,
          },
        });
        if (existing) continue;

        const studentFirstName =
          enrollment.user.firstName || enrollment.user.email.split("@")[0];

        const result = await generateWeeklyReviewAndPlan({
          enrollmentId: enrollment.id,
          weekStart: lastWeekStart,
          weekEnd: lastWeekEnd,
          studentFirstName,
          examDate: enrollment.onboarding?.examDate ?? null,
          aiModel: enrollment.product.aiModel,
        });

        if (enrollment.channel !== "EMAIL") {
          // SMS weekly recap is not supported — skip send but keep review/plan.
          continue;
        }

        const weekLabel = `${format(lastWeekStart, "d MMM", { locale: fr })} — ${format(lastWeekEnd, "d MMM yyyy", { locale: fr })}`;
        const dashboardUrl = `${process.env.APP_URL ?? ""}/tableau-de-bord/etudiant`;
        const { html, text } = buildWeeklyRecapEmail({
          studentFirstName,
          weekLabel,
          summaryMarkdown: result.summaryMarkdown,
          score: result.aggregates.avgScore,
          responseRate: result.aggregates.responseRate,
          streak: result.streak,
          plannedChapters: result.plannedChapters,
          dashboardUrl,
        });

        const messageId = await sendWeeklyRecapEmail({
          recipientEmail: enrollment.user.email,
          recipientName: studentFirstName,
          subject: `Votre bilan de la semaine — ${weekLabel}`,
          htmlBody: html,
          textBody: text,
        });

        await prisma.weeklyEmailLog.create({
          data: {
            enrollmentId: enrollment.id,
            weekStartDate: lastWeekStart,
            weekEndDate: lastWeekEnd,
            emailMessageId: messageId,
            contentSummary: {
              aggregates: result.aggregates,
              plannedChapters: result.plannedChapters,
              streak: result.streak,
            } as unknown as object,
            sentAt: new Date(),
          },
        });

        sendMakeWebhook("accompagnement.weekly.sent" as any, {
          enrollment_id: enrollment.id,
          student_email: enrollment.user.email,
          week_start: lastWeekStart.toISOString(),
          week_end: lastWeekEnd.toISOString(),
          score: result.aggregates.avgScore,
          response_rate: result.aggregates.responseRate,
          streak: result.streak,
          sent_at: new Date().toISOString(),
        }).catch(() => {});

        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Enrollment ${enrollment.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      total: enrollments.length,
      currentHour,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Weekly recap cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
