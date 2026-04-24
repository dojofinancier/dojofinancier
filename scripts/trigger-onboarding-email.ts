import { prisma } from "../lib/prisma";
import { sendAccompagnementOnboardingWelcomeEmail } from "../lib/channels/email";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const positionalArgs = args.filter((arg) => arg !== "--force");
  const userEmail = positionalArgs[0];
  const courseSlug = positionalArgs[1] ?? "negp";

  if (!userEmail) {
    throw new Error(
      "Usage: npx tsx scripts/trigger-onboarding-email.ts <user-email> [course-slug] [--force]"
    );
  }

  const enrollment = await prisma.accompagnementEnrollment.findFirst({
    where: {
      user: { email: userEmail },
      isActive: true,
      product: { course: { slug: courseSlug } },
    },
    include: {
      user: {
        select: { email: true, firstName: true },
      },
      onboarding: {
        include: {
          chapterAssessments: {
            where: { status: { in: ["NOT_STARTED", "READ_LOW"] } },
            orderBy: { chapter: "asc" },
            select: { chapter: true, topic: true },
          },
        },
      },
      product: {
        include: { course: { select: { slug: true, title: true } } },
      },
    },
  });

  if (!enrollment && !force) {
    throw new Error(
      `No active accompagnement enrollment found for ${userEmail} on course ${courseSlug}`
    );
  }

  const recipientName =
    enrollment?.user.firstName?.trim() ||
    userEmail.split("@")[0] ||
    "Bonjour";
  const weakChapterLines =
    enrollment?.onboarding?.chapterAssessments.map((c) =>
      c.topic?.trim() ? c.topic.trim() : `Chapitre ${c.chapter}`
    ) ?? [];

  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const dashboardUrl = base
    ? `${base.replace(/\/$/, "")}/tableau-de-bord/etudiant?tab=accompagnement`
    : null;

  const result = await sendAccompagnementOnboardingWelcomeEmail({
    recipientEmail: userEmail,
    recipientName,
    weakChapterLines,
    dashboardUrl,
  });

  if (!result.ok) {
    if (enrollment) {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO onboarding_email_logs (
          enrollment_id, recipient_email, status, error_message, meta
        ) VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        enrollment.id,
        userEmail,
        "FAILED",
        result.error.slice(0, 2000),
        JSON.stringify({ manual: true, courseSlug, force })
      );
    } else {
      console.warn(
        "No enrollment found in --force mode; skipped onboarding_email_logs insert for FAILED status."
      );
    }
    throw new Error(result.error);
  }

  if (enrollment) {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO onboarding_email_logs (
        enrollment_id, recipient_email, status, email_message_id, meta
      ) VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      enrollment.id,
      userEmail,
      "SENT",
      result.emailId,
      JSON.stringify({ manual: true, courseSlug, force })
    );
  } else {
    console.warn(
      "No enrollment found in --force mode; skipped onboarding_email_logs insert for SENT status."
    );
  }

  const courseLabel = enrollment?.product.course.title ?? `course slug "${courseSlug}"`;
  console.log(`Welcome onboarding email sent for ${userEmail} (${courseLabel})`);
  console.log(`emailId: ${result.emailId ?? "n/a"}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

