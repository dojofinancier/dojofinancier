/**
 * Diagnostic script: compare CouponUsage records vs enrollments that used a coupon (from Stripe metadata).
 * Helps identify undercounted coupon usage.
 *
 * Run: npx tsx scripts/diagnose-coupon-usage.ts
 *
 * Requires STRIPE_SECRET_KEY (same key as payments - live for live data).
 */

import { prisma } from "../lib/prisma";
import { stripe } from "../lib/stripe/server";

async function main() {
  // Get all coupons with their usage counts
  const coupons = await prisma.coupon.findMany({
    select: {
      id: true,
      code: true,
      usedCount: true,
      _count: { select: { couponUsage: true } },
    },
  });

  console.log("\n=== Coupon Usage Summary ===\n");
  console.log("Coupon (usedCount from DB) vs actual CouponUsage records:\n");

  for (const c of coupons) {
    const mismatch = c.usedCount !== c._count.couponUsage;
    const flag = mismatch ? " ⚠️ MISMATCH" : "";
    console.log(`  ${c.code}: usedCount=${c.usedCount}, couponUsage=${c._count.couponUsage}${flag}`);
  }

  // Enrollments with paymentIntentId but no CouponUsage (potential missing records)
  const enrollmentsWithoutCoupon = await prisma.enrollment.findMany({
    where: {
      paymentIntentId: { not: null },
      couponUsage: null,
    },
    select: { id: true, paymentIntentId: true },
  });

  console.log(`\nEnrollments with paymentIntentId but no CouponUsage: ${enrollmentsWithoutCoupon.length}`);

  if (enrollmentsWithoutCoupon.length > 0) {
    let withCouponInMetadata = 0;
    const sample: Array<{ enrollmentId: string; couponId?: string; discount?: string }> = [];

    try {
      for (const e of enrollmentsWithoutCoupon.slice(0, 20)) {
        const pi = await stripe.paymentIntents.retrieve(e.paymentIntentId!);
        const { couponId, discountAmount } = pi.metadata || {};
        if (couponId) {
          withCouponInMetadata++;
          if (sample.length < 5) sample.push({ enrollmentId: e.id, couponId, discount: discountAmount });
        }
      }
      console.log(`  (sampling first 20) Those with couponId in Stripe metadata: ~${withCouponInMetadata}`);
      if (sample.length > 0) {
        console.log("  Sample enrollments that used a coupon but have no CouponUsage:");
        sample.forEach((s) => console.log(`    - ${s.enrollmentId} (couponId=${s.couponId})`));
      }
    } catch (err) {
      console.log("  (Skipping Stripe metadata check - ensure STRIPE_SECRET_KEY is set correctly)");
    }
    console.log("\n  Run backfill to fix: npx tsx scripts/backfill-coupon-usage-from-stripe.ts");
    console.log("  Dry run first: DRY_RUN=1 npx tsx scripts/backfill-coupon-usage-from-stripe.ts\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
