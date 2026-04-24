import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createAccompagnementEnrollment } from "@/lib/accompagnement/payment-flow";

const enrollmentBodySchema = z.object({
  accompagnementProductId: z.string().min(1),
  paymentIntentId: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Non authentifié" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Corps de requête invalide" },
      { status: 400 }
    );
  }

  const parsed = enrollmentBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Données invalides" },
      { status: 400 }
    );
  }

  const result = await createAccompagnementEnrollment({
    userId: user.id,
    accompagnementProductId: parsed.data.accompagnementProductId,
    paymentIntentId: parsed.data.paymentIntentId,
  });

  const status = result.success ? 200 : 400;
  return NextResponse.json(result, { status });
}
