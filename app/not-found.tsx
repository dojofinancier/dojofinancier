import { NotFoundClient } from "./not-found-client";
import { Suspense } from "react";
import Script from "next/script";
import { BrutalistNavbar } from "@/components/layout/brutalist-navbar";
import { BrutalistNavbarClient } from "@/components/layout/brutalist-navbar-client";

export default function NotFound() {
  return (
    <>
      <Script
        id="not-found-chrome"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var root = document.documentElement;
              root.dataset.chrome = 'brutalist';
              root.dataset.chromeLock = 'brutalist';
            })();
          `,
        }}
      />
      <Suspense
        fallback={<BrutalistNavbarClient user={undefined} variant="solid" dashboardUrl={null} />}
      >
        <BrutalistNavbar variant="solid" />
      </Suspense>
      <NotFoundClient />
    </>
  );
}

