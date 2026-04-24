import { prisma } from "@/lib/prisma";
import { sendAccompagnementOnboardingWelcomeEmail } from "@/lib/channels/email";

interface OnboardingEmailPayload {
  enrollmentId: string;
  recipientEmail: string;
  recipientName: string;
  weakChapterLines: string[];
}

function getDashboardUrl(): string | null {
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/tableau-de-bord/etudiant?tab=accompagnement`;
}

export async function sendOnboardingWelcomeEmailAndLog(
  payload: OnboardingEmailPayload
): Promise<{ ok: boolean; error?: string; emailId?: string | null }> {
  const result = await sendAccompagnementOnboardingWelcomeEmail({
    recipientEmail: payload.recipientEmail,
    recipientName: payload.recipientName,
    weakChapterLines: payload.weakChapterLines,
    dashboardUrl: getDashboardUrl(),
  });

  if (!result.ok) {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO onboarding_email_logs (
        enrollment_id, recipient_email, status, error_message, meta
      ) VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      payload.enrollmentId,
      payload.recipientEmail,
      "FAILED",
      result.error.slice(0, 2000),
      JSON.stringify({ weakChapterCount: payload.weakChapterLines.length })
    );
    return { ok: false, error: result.error };
  }

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO onboarding_email_logs (
      enrollment_id, recipient_email, status, email_message_id, meta
    ) VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    payload.enrollmentId,
    payload.recipientEmail,
    "SENT",
    result.emailId,
    JSON.stringify({ weakChapterCount: payload.weakChapterLines.length })
  );

  return { ok: true, emailId: result.emailId };
}

