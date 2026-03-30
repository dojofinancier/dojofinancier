import type { Metadata } from "next";
import { ContactPageClient } from "./contact-page-client";
import { Suspense } from "react";
import { BrutalistNavbar } from "@/components/layout/brutalist-navbar";
import { BrutalistNavbarClient } from "@/components/layout/brutalist-navbar-client";
import { absoluteUrl, siteOpenGraphDefaults, siteTwitterDefaults } from "@/lib/seo/metadata-helpers";

const CONTACT_TITLE = "Contact";
const CONTACT_DESCRIPTION =
  "Contactez Le Dojo Financier pour vos questions sur les formations, les examens OCRI et CSI ou l’accompagnement.";

export const metadata: Metadata = {
  title: CONTACT_TITLE,
  description: CONTACT_DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    ...siteOpenGraphDefaults(),
    title: CONTACT_TITLE,
    description: CONTACT_DESCRIPTION,
    url: absoluteUrl("/contact"),
  },
  twitter: {
    ...siteTwitterDefaults(),
    title: CONTACT_TITLE,
    description: CONTACT_DESCRIPTION,
  },
};

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

