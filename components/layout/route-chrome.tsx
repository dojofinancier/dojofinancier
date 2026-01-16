"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    const next = getChromeForPathname(pathname);
    const root = document.documentElement;

    if (next === "brutalist") {
      root.dataset.chrome = "brutalist";
    } else {
      delete root.dataset.chrome;
    }
  }, [pathname]);

  return null;
}

