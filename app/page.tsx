import { HomePageClient } from "@/app/home-page-client";
import { Suspense } from "react";
import { BrutalistNavbar } from "@/components/layout/brutalist-navbar";
import { BrutalistNavbarClient } from "@/components/layout/brutalist-navbar-client";

// Cache configuration for performance - home page is mostly static
export const revalidate = 3600; // 1 hour in seconds

// ============================================
// MAIN PAGE COMPONENT (Server Component)
// ============================================
export default function HomePage() {
  return (
    <>
      <Suspense
        fallback={<BrutalistNavbarClient user={undefined} variant="transparent" dashboardUrl={null} />}
      >
        <BrutalistNavbar variant="transparent" />
      </Suspense>
      <HomePageClient />
    </>
  );
}
