import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** Compare two strings in constant time (UTF-8). Length mismatch returns false immediately. */
export function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Cron routes: `?secret=<CRON_SECRET>` or `Authorization: Bearer <CRON_SECRET>`.
 */
export function verifyCronAuth(request: NextRequest): { ok: boolean } {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false };

  const queryParam = request.nextUrl.searchParams.get("secret");
  if (queryParam != null && timingSafeStringEqual(queryParam, secret)) {
    return { ok: true };
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    if (timingSafeStringEqual(token, secret)) return { ok: true };
  }

  return { ok: false };
}

/** `Authorization: Bearer <secret>` compared in constant time. */
export function verifyBearerSecret(
  request: NextRequest,
  secret: string | undefined
): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice(7);
  return timingSafeStringEqual(token, secret);
}
