import { NextRequest, NextResponse } from "next/server";

/**
 * Short-URL redirect used by SMS.
 *   /c/<token>  →  302  /checkin/<token>
 */
export function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return handle(request, params);
}

async function handle(
  request: NextRequest,
  paramsPromise: Promise<{ token: string }>
) {
  const { token } = await paramsPromise;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  const target = new URL(`/checkin/${encodeURIComponent(token)}`, request.url);
  return NextResponse.redirect(target, { status: 302 });
}
