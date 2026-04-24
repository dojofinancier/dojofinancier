/**
 * Grant accompagnement access without Stripe (admin / comp).
 *
 * Requirements:
 *   - User exists (by email or user UUID).
 *   - User has an active main-course Enrollment for the course tied to the product.
 *   - No duplicate active AccompagnementEnrollment for that product.
 *
 * Onboarding stays false; the student completes configuration in the tab.
 *
 * Usage:
 *   npx tsx scripts/grant-accompagnement-enrollment.ts <email|user-uuid> <accompagnement-product-uuid|course-slug> [options]
 *
 * Options:
 *   --allow-unpublished   Grant even if the accompagnement product is not published.
 *   --dry-run             Show what would happen without writing.
 *   --list                Print accompagnement products (id, course slug, title) and exit.
 */

import { prisma } from "../lib/prisma";

const USAGE = [
  "Usage:",
  "  npx tsx scripts/grant-accompagnement-enrollment.ts <email|user-uuid> <product-uuid|course-slug> [options]",
  "",
  "Options:",
  "  --allow-unpublished    Allow granting when the product is not published",
  "  --dry-run              Validate only, no database write",
  "  --list                 List accompagnement products and exit",
  "",
  "Examples:",
  "  npx tsx scripts/grant-accompagnement-enrollment.ts --list",
  "  npx tsx scripts/grant-accompagnement-enrollment.ts student@example.com erci",
  "  npx tsx scripts/grant-accompagnement-enrollment.ts student@example.com <accompagnement-product-uuid>",
].join("\n");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function userHasActiveCourseEnrollment(
  userId: string,
  courseId: string
): Promise<boolean> {
  const row = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId,
      expiresAt: { gte: new Date() },
    },
    select: { id: true },
  });
  return !!row;
}

async function listProducts() {
  const rows = await prisma.accompagnementProduct.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      published: true,
      course: { select: { slug: true, title: true } },
    },
  });
  if (rows.length === 0) {
    console.log("No accompagnement products found.");
    return;
  }
  console.log("id\tcourse_slug\tpublished\ttitle");
  for (const r of rows) {
    console.log(
      `${r.id}\t${r.course.slug ?? "?"}\t${r.published}\t${r.title}`
    );
  }
}

function parseArgs(argv: string[]) {
  const args = argv.filter((a) => a !== "");
  let allowUnpublished = false;
  let dryRun = false;
  let list = false;
  const positional: string[] = [];

  for (const a of args) {
    if (a === "--allow-unpublished") allowUnpublished = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--list") list = true;
    else if (a.startsWith("--")) throw new Error(`Unknown option "${a}".\n\n${USAGE}`);
    else positional.push(a);
  }

  return { positional, allowUnpublished, dryRun, list };
}

async function main() {
  const { positional, allowUnpublished, dryRun, list } = parseArgs(
    process.argv.slice(2)
  );

  if (list) {
    await listProducts();
    return;
  }

  const userKey = positional[0];
  const productKey = positional[1];
  if (!userKey || !productKey) {
    throw new Error(USAGE);
  }

  const user = UUID_RE.test(userKey)
    ? await prisma.user.findUnique({ where: { id: userKey } })
    : await prisma.user.findUnique({ where: { email: userKey } });

  if (!user) {
    throw new Error(`User not found: ${userKey}`);
  }

  const product = UUID_RE.test(productKey)
    ? await prisma.accompagnementProduct.findUnique({
        where: { id: productKey },
        include: { course: { select: { id: true, slug: true, title: true } } },
      })
    : await prisma.accompagnementProduct.findFirst({
        where: { course: { slug: productKey } },
        include: { course: { select: { id: true, slug: true, title: true } } },
      });

  if (!product) {
    throw new Error(
      `Accompagnement product not found for "${productKey}" (use UUID or course slug). Try --list.`
    );
  }

  if (!product.published && !allowUnpublished) {
    throw new Error(
      `Product is not published. Use --allow-unpublished to grant anyway.`
    );
  }

  const eligible = await userHasActiveCourseEnrollment(
    user.id,
    product.courseId
  );
  if (!eligible) {
    throw new Error(
      `User ${user.email} has no active enrollment in course "${product.course.title}" (${product.course.slug}). Enroll them in the main product first.`
    );
  }

  const existing = await prisma.accompagnementEnrollment.findFirst({
    where: {
      userId: user.id,
      accompagnementProductId: product.id,
      expiresAt: { gte: new Date() },
      isActive: true,
    },
    select: { id: true, expiresAt: true, onboardingCompleted: true },
  });

  if (existing) {
    console.log(
      `Already has active accompagnement enrollment ${existing.id} (expires ${existing.expiresAt.toISOString()}, onboardingCompleted=${existing.onboardingCompleted}).`
    );
    return;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + product.accessDurationDays);

  const lastOrder = await prisma.accompagnementEnrollment.findFirst({
    where: { orderNumber: { not: null } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  const nextOrderNumber = (lastOrder?.orderNumber ?? 9999) + 1;

  console.log(`User:        ${user.email} (${user.id})`);
  console.log(`Product:     ${product.title} (${product.id})`);
  console.log(`Course:      ${product.course.title} [${product.course.slug}]`);
  console.log(`Expires at:  ${expiresAt.toISOString()}`);
  console.log(`Order #:     ${nextOrderNumber}`);
  console.log(`paymentIntentId: (none — manual grant)`);

  if (dryRun) {
    console.log("\n--dry-run: no row created.");
    return;
  }

  const enrollment = await prisma.accompagnementEnrollment.create({
    data: {
      userId: user.id,
      accompagnementProductId: product.id,
      paymentIntentId: null,
      orderNumber: nextOrderNumber,
      expiresAt,
      onboardingCompleted: false,
      isActive: true,
    },
  });

  console.log(`\nCreated accompagnement enrollment: ${enrollment.id}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
