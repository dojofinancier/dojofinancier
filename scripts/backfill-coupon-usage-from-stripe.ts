/**
 * One-time script: create CouponUsage for enrollments that have a paymentIntentId
 * but no couponUsage, using Stripe PaymentIntent metadata (couponId, discountAmount).
 * Use this to fix live transactions that used a discount but never had coupon usage recorded
 * (e.g. when the frontend created the enrollment before the webhook ran).
 *
 * Run with the SAME Stripe key as the payments (live key for live transactions):
 *   npx tsx scripts/backfill-coupon-usage-from-stripe.ts
 *
 * Optional: set DRY_RUN=1 to only log what would be done.
 */

// Load .env first (before stripe init) - dotenv/config runs on import
import "dotenv/config";

import { prisma } from "../lib/prisma";
import { stripe } from "../lib/stripe/server";
import { trackCouponUsageAction } from "../app/actions/coupons";

const DRY_RUN = process.env.DRY_RUN === "1";

async function main() {
  const enrollmentsWithoutCoupon = await prisma.enrollment.findMany({
    where: {
      paymentIntentId: { not: null },
      couponUsage: null,
    },
    select: {
      id: true,
      paymentIntentId: true,
      courseId: true,
    },
  });

  console.log(
    `Found ${enrollmentsWithoutCoupon.length} enrollment(s) with paymentIntentId but no couponUsage.`
  );

  let backfilled = 0;
  let skipped = 0;
  let errors = 0;

  for (const enrollment of enrollmentsWithoutCoupon) {
    const piId = enrollment.paymentIntentId!;
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      const { couponId, discountAmount } = pi.metadata || {};
      if (!couponId || !discountAmount) {
        skipped++;
        continue;
      }
      const discount = parseFloat(discountAmount);
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would backfill enrollment ${enrollment.id} with coupon ${couponId}, discount ${discount}`);
        backfilled++;
        continue;
      }
      const result = await trackCouponUsageAction(couponId, enrollment.id, discount);
      if (result.success) {
        backfilled++;
        console.log(`Backfilled enrollment ${enrollment.id} (PI ${piId.slice(-12)})`);
      } else {
        skipped++;
      }
    } catch (err) {
      errors++;
      console.error(`Enrollment ${enrollment.id} (PI ${piId}):`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Done. Backfilled: ${backfilled}, skipped: ${skipped}, errors: ${errors}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
