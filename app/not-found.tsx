import { NotFoundClient } from "./not-found-client";
import { Suspense } from "react";
import { BrutalistNavbar } from "@/components/layout/brutalist-navbar";
import { BrutalistNavbarClient } from "@/components/layout/brutalist-navbar-client";

export default function NotFound() {
  return (
    <>
      <Suspense
        fallback={<BrutalistNavbarClient user={undefined} variant="solid" dashboardUrl={null} />}
      >
        <BrutalistNavbar variant="solid" />
      </Suspense>
      <NotFoundClient />
    </>
  );
}

