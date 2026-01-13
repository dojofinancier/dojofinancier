import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/courses", // Keep for backward compatibility (redirects to /formations)
    "/formations",
    "/panier", // Cart page
    "/blog",
    "/login",
    "/reset-password",
    "/checkout", // Checkout is public (user creates account during checkout) - redirects to /paiement
    "/paiement", // Payment checkout (public, user creates account during checkout)
    "/api/webhooks", // Webhook endpoints are public
  ];
  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`)
  );

  // Only check auth for protected routes
  if (!isPublicRoute) {
    return await updateSession(request);
  }

  // Still update session for public routes (to refresh tokens)
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

