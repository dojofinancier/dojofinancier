import { sendMakeWebhook } from "@/lib/webhooks/make";

export type AccompagnementEnrollmentCreatedSource = "stripe" | "manual_grant";

export type AccompagnementEnrollmentCreatedPayload = {
  enrollment_id: string | undefined;
  user_id: string;
  user_email: string;
  /** Separate given name for CRM / Make filters */
  first_name: string;
  /** Separate family name for CRM / Make filters */
  last_name: string;
  /** Legacy combined display name */
  user_name: string;
  product_id: string;
  product_title: string;
  /** Same as product_title; explicit alias for automations */
  product_name: string;
  course_title: string;
  course_slug: string;
  source: AccompagnementEnrollmentCreatedSource;
  amount: number;
  payment_intent_id: string | null;
  timestamp: string;
};

export function buildAccompagnementEnrollmentCreatedPayload(params: {
  enrollmentId: string | undefined;
  userId: string;
  userEmail: string;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  productId: string;
  productTitle: string;
  courseTitle: string;
  courseSlug: string | null | undefined;
  source: AccompagnementEnrollmentCreatedSource;
  amountCad?: number | null;
  paymentIntentId: string | null;
}): AccompagnementEnrollmentCreatedPayload {
  const first = (params.firstName ?? "").trim();
  const last = (params.lastName ?? "").trim();
  const userName = `${first} ${last}`.trim() || params.userEmail;

  return {
    enrollment_id: params.enrollmentId,
    user_id: params.userId,
    user_email: params.userEmail,
    first_name: first,
    last_name: last,
    user_name: userName,
    product_id: params.productId,
    product_title: params.productTitle,
    product_name: params.productTitle,
    course_title: params.courseTitle,
    course_slug: (params.courseSlug ?? "").trim(),
    source: params.source,
    amount: params.amountCad ?? 0,
    payment_intent_id: params.paymentIntentId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Make.com: accompagnement enrollment (paid via Stripe or manual grant script).
 */
export function notifyAccompagnementEnrollmentCreated(
  params: Parameters<typeof buildAccompagnementEnrollmentCreatedPayload>[0]
): Promise<void> {
  return sendMakeWebhook(
    "accompagnement.enrollment.created",
    buildAccompagnementEnrollmentCreatedPayload(params)
  );
}
