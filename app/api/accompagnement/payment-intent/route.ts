import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  createAccompagnementPaymentIntentForUser,
  createAccompagnementPaymentIntentSchema,
} from "@/lib/accompagnement/payment-flow";

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

  const parsed = createAccompagnementPaymentIntentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Données invalides" },
      { status: 400 }
    );
  }

  const result = await createAccompagnementPaymentIntentForUser(
    user.id,
    parsed.data
  );
  const status = result.success ? 200 : 400;
  return NextResponse.json(result, { status });
}
