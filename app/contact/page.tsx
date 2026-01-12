import { ContactPageClient } from "./contact-page-client";
import { Suspense } from "react";
import { BrutalistNavbar } from "@/components/layout/brutalist-navbar";
import { BrutalistNavbarClient } from "@/components/layout/brutalist-navbar-client";

export default function ContactPage() {
  return (
    <>
      <Suspense
        fallback={<BrutalistNavbarClient user={undefined} variant="solid" dashboardUrl={null} />}
      >
        <BrutalistNavbar variant="solid" />
      </Suspense>
      <ContactPageClient />
    </>
  );
}

