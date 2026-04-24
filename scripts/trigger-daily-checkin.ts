import type { CheckInType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createAndSendCheckIn } from "../lib/accompagnement/engine";
import { getCheckInTypeForDate } from "../lib/accompagnement/schedule";
import {
  getEasternStartOfDay,
  getEasternEndOfDay,
} from "../lib/utils/timezone";
import { normalizePhoneToE164 } from "../lib/utils/phone-e164";

const VALID_TYPES: CheckInType[] = ["LIGHT", "MID_WEEK", "WEEKLY", "MISSED"];

const USAGE = [
  "Usage:",
  "  npx tsx scripts/trigger-daily-checkin.ts <email|enrollment-id> [course-slug] [options]",
  "",
  "Options:",
  "  --type=<LIGHT|MID_WEEK|WEEKLY|MISSED>   Force the check-in type (default: today's type).",
  "  --replace-today                         Delete today's ET daily_check_ins first (allows re-send).",
  "  --missed-replacement                    Pass isMissedReplacement=true (use with --type=MISSED).",
  "  --sms                                   Send via Twilio SMS (requires TWILIO_* env vars).",
  "  --phone=+14165551234                    Destination for --sms (optional if enrollment.phone_e164 is set).",
  "",
  "Examples:",
  "  npm run accompagnement:trigger-daily-checkin -- user@example.com --type=LIGHT --replace-today",
  "  npm run accompagnement:trigger-daily-checkin -- user@example.com negp --type=WEEKLY",
  "  npm run accompagnement:trigger-daily-checkin -- 392e57f2-0827-4865-b52e-a6f8871b2c41 --type=MISSED --missed-replacement",
  "  npm run accompagnement:trigger-daily-checkin -- user@example.com --sms --phone=+15145550100 --replace-today",
].join("\n");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ParsedArgs {
  identifier: string;
  courseSlug: string | null;
  type: CheckInType | null;
  replaceToday: boolean;
  missedReplacement: boolean;
  sms: boolean;
  phone: string | null;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.filter((a) => a !== "");
  let replaceToday = false;
  let missedReplacement = false;
  let sms = false;
  let phone: string | null = null;
  let typeFlag: CheckInType | null = null;
  const positional: string[] = [];

  for (const a of args) {
    if (a === "--replace-today") replaceToday = true;
    else if (a === "--missed-replacement") missedReplacement = true;
    else if (a === "--sms") sms = true;
    else if (a.startsWith("--phone=")) {
      phone = a.slice("--phone=".length).trim() || null;
    } else if (a.startsWith("--type=")) {
      const v = a.slice("--type=".length).toUpperCase() as CheckInType;
      if (!VALID_TYPES.includes(v)) {
        throw new Error(
          `Invalid --type value "${v}". Use one of: ${VALID_TYPES.join(", ")}`
        );
      }
      typeFlag = v;
    } else if (a.startsWith("--")) {
      throw new Error(`Unknown option "${a}".\n\n${USAGE}`);
    } else {
      positional.push(a);
    }
  }

  const identifier = positional[0];
  if (!identifier) throw new Error(USAGE);

  let courseSlug: string | null = null;
  let positionalType: CheckInType | null = null;
  for (const p of positional.slice(1)) {
    const upper = p.toUpperCase();
    if (
      (VALID_TYPES as string[]).includes(upper) &&
      positionalType === null &&
      typeFlag === null
    ) {
      positionalType = upper as CheckInType;
    } else if (!courseSlug) {
      courseSlug = p;
    }
  }

  return {
    identifier,
    courseSlug,
    type: typeFlag ?? positionalType,
    replaceToday,
    missedReplacement,
    sms,
    phone,
  };
}

async function resolveEnrollmentId(
  identifier: string,
  courseSlug: string | null
): Promise<string> {
  if (UUID_RE.test(identifier)) return identifier;

  if (!identifier.includes("@")) {
    throw new Error(
      `"${identifier}" is neither a valid enrollment UUID nor an email address.`
    );
  }

  const enrollments = await prisma.accompagnementEnrollment.findMany({
    where: {
      user: { email: identifier },
      isActive: true,
      ...(courseSlug ? { product: { course: { slug: courseSlug } } } : {}),
    },
    select: {
      id: true,
      product: { select: { course: { select: { slug: true, title: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (enrollments.length === 0) {
    throw new Error(
      `No active accompagnement enrollment for ${identifier}${courseSlug ? ` on course "${courseSlug}"` : ""}.`
    );
  }
  if (enrollments.length > 1 && !courseSlug) {
    const list = enrollments
      .map((e) => `  - ${e.product.course.slug} (${e.id})`)
      .join("\n");
    throw new Error(
      `Multiple active enrollments for ${identifier}. Pass a course slug to disambiguate:\n${list}`
    );
  }

  const picked = enrollments[0];
  console.log(
    `Resolved ${identifier} → enrollment ${picked.id} (course "${picked.product.course.slug}")`
  );
  return picked.id;
}

function assertTwilioEnv() {
  const need = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"];
  const missing = need.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing env for SMS: ${missing.join(", ")}. Set them in .env before using --sms.`
    );
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const enrollmentId = await resolveEnrollmentId(
    parsed.identifier,
    parsed.courseSlug
  );

  if (parsed.sms) {
    assertTwilioEnv();
  }

  const now = new Date();
  const type: CheckInType = parsed.type ?? getCheckInTypeForDate(now);

  if (parsed.missedReplacement && type !== "MISSED") {
    throw new Error(
      "--missed-replacement is only valid with --type=MISSED (mimics post-missed cron flow)."
    );
  }

  if (parsed.replaceToday) {
    const start = getEasternStartOfDay(now);
    const end = getEasternEndOfDay(now);
    const deleted = await prisma.dailyCheckIn.deleteMany({
      where: {
        enrollmentId,
        scheduledFor: { gte: start, lte: end },
      },
    });
    console.log(
      `Removed ${deleted.count} row(s) in daily_check_ins for this enrollment today (America/Toronto).`
    );
  }

  let dispatchOverride:
    | { channel: "SMS"; phoneE164: string | null }
    | undefined;

  if (parsed.sms) {
    const enrollment = await prisma.accompagnementEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { phoneE164: true },
    });
    const raw = parsed.phone ?? enrollment?.phoneE164 ?? null;
    const e164 = normalizePhoneToE164(raw ?? "");
    if (!e164) {
      throw new Error(
        "SMS: fournis un numéro valide avec --phone=+15145550100 ou enregistre phone_e164 sur l'inscription."
      );
    }
    dispatchOverride = { channel: "SMS", phoneE164: e164 };
    console.log(`SMS mode → ${e164} (Twilio)`);
  }

  console.log(`Dispatching ${type} check-in for enrollment ${enrollmentId}...`);

  const result = await createAndSendCheckIn({
    enrollmentId,
    type,
    isMissedReplacement: parsed.missedReplacement,
    now,
    ...(dispatchOverride ? { dispatchOverride } : {}),
  });

  if (result.created) {
    console.log(`Created and dispatched check-in: ${result.checkInId}`);
    if (result.error) {
      console.warn(`Dispatch reported error: ${result.error}`);
      process.exitCode = 1;
    }
  } else if (result.error) {
    throw new Error(result.error);
  } else {
    console.log(
      `Skipped: ${result.skippedReason ?? "unknown"} (existing id: ${result.checkInId ?? "n/a"})`
    );
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
