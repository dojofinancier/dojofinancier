import { HomePageClient } from "@/app/home-page-client";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BrutalistNavbar } from "@/components/layout/brutalist-navbar";
import { BrutalistNavbarClient } from "@/components/layout/brutalist-navbar-client";

export const metadata: Metadata = {
  title: "Le Dojo Financier — Préparation aux examens OCRI & CSI",
  description:
    "Préparation aux examens de l'OCRI et CSI : ERCI, EVMCD, CCVM, NEGP. Diagnostic, plan d'étude, apprentissage structuré, QCM, examens blancs et accompagnement.",
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
