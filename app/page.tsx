import { HomePageClient } from "@/app/home-page-client";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BrutalistNavbar } from "@/components/layout/brutalist-navbar";
import { BrutalistNavbarClient } from "@/components/layout/brutalist-navbar-client";
import { absoluteUrl, siteOpenGraphDefaults, siteTwitterDefaults } from "@/lib/seo/metadata-helpers";

const HOME_TITLE = "Le Dojo Financier — Préparation aux examens OCRI & CSI";
const HOME_DESCRIPTION =
  "Préparation aux examens de l'OCRI et CSI : ERCI, EVMCD, CCVM, NEGP. Diagnostic, plan d'étude, apprentissage structuré, QCM, examens blancs et accompagnement.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    ...siteOpenGraphDefaults(),
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: absoluteUrl("/"),
  },
  twitter: {
    ...siteTwitterDefaults(),
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

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
