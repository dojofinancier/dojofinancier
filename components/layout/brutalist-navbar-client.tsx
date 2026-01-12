"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { BrutalistUserMenu } from "./brutalist-user-menu";

interface BrutalistNavbarClientProps {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null | undefined;
  variant?: "transparent" | "solid";
  dashboardUrl: string | null;
}

export function BrutalistNavbarClient({ user, variant = "transparent", dashboardUrl }: BrutalistNavbarClientProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (variant !== "transparent") return;
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [variant]);

  const bgClass = variant === "solid" 
    ? "bg-black" 
    : scrolled 
      ? "bg-black" 
      : "bg-transparent";

  // Loading state (used as a Suspense fallback): avoid showing the wrong logged-out UI briefly.
  if (user === undefined) {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${bgClass}`}
        data-transparent-nav
      >
        <nav className="border-b-4 border-white" data-transparent-nav>
          <div className="flex h-20 items-center justify-between px-4 sm:px-8">
            <Link href="/" className="flex items-center hover:opacity-70 transition-opacity">
              <Image
                src="/logo_light.png"
                alt="Le Dojo Financier"
                width={200}
                height={50}
                className="h-auto w-auto max-h-12"
                priority
              />
            </Link>

            <div className="flex items-center gap-4">
              <div
                className="h-10 w-44 border-4 border-white bg-white/10 animate-pulse"
                aria-hidden="true"
              />
              <div
                className="h-10 w-32 border-4 border-white bg-white/10 animate-pulse"
                aria-hidden="true"
              />
            </div>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${bgClass}`}
      data-transparent-nav
    >
      <nav className="border-b-4 border-white" data-transparent-nav>
        <div className="flex h-20 items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center hover:opacity-70 transition-opacity">
            <Image
              src="/logo_light.png"
              alt="Le Dojo Financier"
              width={200}
              height={50}
              className="h-auto w-auto max-h-12"
              priority
            />
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link 
                  href={dashboardUrl || "/tableau-de-bord"}
                  className="bg-white text-black font-black uppercase text-sm tracking-wider px-4 py-2 border-4 border-white hover:bg-black hover:text-white transition-colors flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Tableau de bord</span>
                </Link>
                <BrutalistUserMenu user={user} />
              </>
            ) : (
              <Link 
                href="/login" 
                className="bg-white text-black font-black uppercase text-sm tracking-wider px-6 py-3 border-4 border-white hover:bg-black hover:text-white transition-colors"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}

