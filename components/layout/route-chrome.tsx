"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

type ChromeMode = "default" | "brutalist";

function getChromeForPathname(pathname: string): ChromeMode {
  // Pages that have their own custom (brutalist) navbar.
  if (
    pathname === "/" ||
    pathname === "/contact" ||
    pathname.startsWith("/formations") ||
    // Only investisseur pages that are NOT waitlist pages
    (pathname.startsWith("/investisseur") && !pathname.includes("/waitlist")) ||
    // Only cohort product pages, not learning dashboard
    (pathname.startsWith("/cohorte") && !pathname.includes("/apprendre"))
  ) return "brutalist";
  return "default";
}

export function RouteChrome() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const lockedChrome = root.dataset.chromeLock as ChromeMode | undefined;

    if (lockedChrome) {
      root.dataset.chrome = lockedChrome;
      return;
    }

    const next = getChromeForPathname(pathname);

    if (next === "brutalist") {
      root.dataset.chrome = "brutalist";
    } else {
      delete root.dataset.chrome;
    }
  }, [pathname]);

  return null;
}
