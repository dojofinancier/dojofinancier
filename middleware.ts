import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Sentry tunnel (withSentryConfig tunnelRoute) — avoid session work on ingest proxy
  if (request.nextUrl.pathname.startsWith("/monitoring")) {
    return NextResponse.next();
  }

  // Webhook/API routes handle their own auth -- skip session handling entirely
  if (request.nextUrl.pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  // Observability endpoints: avoid Supabase session work on frequent polls / automation
  if (
    request.nextUrl.pathname.startsWith("/api/health") ||
    request.nextUrl.pathname.startsWith("/api/incident-triage")
  ) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (images, fonts, etc.)
     * 
     * Performance: Excluding more file types reduces middleware overhead
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|pdf|mp4|mp3)$).*)",
  ],
};

