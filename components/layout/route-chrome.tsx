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
    pathname.startsWith("/investisseur")
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

