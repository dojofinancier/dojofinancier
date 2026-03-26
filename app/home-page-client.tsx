"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Product URLs — align slugs with published courses in admin if a link 404s. */
const EXAM_HREF = {
  erci: "/formations/erci",
  evmcd: "/formations/evmcd",
  ccvmVol1: "/formations/ccvm-1",
  ccvmVol2: "/formations/ccvm-2",
  negp: "/formations/negp",
} as const;

// ============================================
// SECTION 2: HERO - BRUTALIST
// ============================================
function HeroSection() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const accentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;

    const reduceMotion = typeof window !== "undefined"
      ? window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
      : false;
    if (reduceMotion) return;

    const update = () => {
      raf = 0;
      const y = window.scrollY || 0;

      const gridY = Math.min(y * 0.35, 180);
      const accentY = Math.min(y * 0.18, 120);

      if (gridRef.current) gridRef.current.style.setProperty("--parallax-y", `${gridY}px`);
      if (accentRef.current) accentRef.current.style.setProperty("--parallax-y", `${accentY}px`);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative min-h-screen bg-black text-white overflow-hidden" data-nav-hero>
      <div
        ref={gridRef}
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(white 2px, transparent 2px),
            linear-gradient(90deg, white 2px, transparent 2px)
          `,
          backgroundSize: "80px 80px",
          transform: "translate3d(0, var(--parallax-y, 0px), 0)",
          willChange: "transform",
        }}
      />

      <div
        ref={accentRef}
        className="absolute top-0 right-0 w-1/3 h-full bg-primary transform origin-top-right skew-x-[-12deg] translate-x-1/4"
        style={{
          transform: "translate3d(0, var(--parallax-y, 0px), 0) skewX(-12deg) translateX(25%)",
          willChange: "transform",
        }}
      />

      <div className="relative pt-32 pb-20 px-4 sm:px-8 min-h-screen flex flex-col justify-center">
        <div className="max-w-[1400px] mx-auto w-full">
          <div className="max-w-[1400px] mx-auto w-full">
            <div>
              <div className="mb-8">
                <span className="text-primary font-mono text-sm uppercase tracking-[0.3em] block mb-4">
                  [ERCI, EVMCD, CCVM, NEGP]
                </span>
                <h1 className="text-[9vw] sm:text-[7vw] md:text-[5.5vw] font-black uppercase leading-[0.9] tracking-tighter">
                  PRÉPARATION 
                  <br />
                  <span className="text-primary">EXAMENS OCRI</span>
                </h1>
              </div>

              <div className="max-w-xl mb-12">
                <div className="border-l-4 border-primary pl-6 py-2">
                  <p className="text-xl sm:text-2xl font-light leading-relaxed">
                    Obtenez vos certifications de l'OCRI et CSI.
                    <span className="font-bold"> Passez vos examens avec confiance.</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/formations?category=professionnels"
                  className="inline-block bg-white text-black font-black uppercase text-lg tracking-wider px-10 py-5 border-4 border-white hover:bg-primary hover:border-primary hover:text-black transition-colors shadow-[8px_8px_0_0_hsl(var(--primary))]"
                >
                  Démarrer ma préparation →
                </Link>
              </div>

              <div className="mt-20 flex flex-wrap gap-0 border-4 border-white inline-flex">
                <div className="px-8 py-6 border-r-4 border-white">
                  <div className="text-5xl font-black text-primary">2500+</div>
                  <div className="text-sm uppercase tracking-wider mt-1 font-mono">Étudiants</div>
                </div>
                <div className="px-8 py-6 border-r-4 border-white">
                  <div className="text-5xl font-black text-primary">95%</div>
                  <div className="text-sm uppercase tracking-wider mt-1 font-mono">Réussite</div>
                </div>
                <div className="px-8 py-6">
                  <div className="text-5xl font-black text-primary">15+</div>
                  <div className="text-sm uppercase tracking-wider mt-1 font-mono">Années</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CHOISISSEZ VOTRE EXAMEN
// ============================================
function ExamChoiceSection() {
  return (
    <section id="choisissez-votre-examen" className="relative bg-white py-24 sm:py-32">
      <div className="px-4 sm:px-8 mb-16">
        <div className="max-w-[1400px] mx-auto">
          <span className="font-mono text-sm uppercase tracking-[0.3em] text-black/50 block mb-4">
            [VOTRE OBJECTIF]
          </span>
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-black leading-[0.9]">
            CHOISISSEZ
            <br />
            VOTRE EXAMEN
          </h2>
        </div>
      </div>

      <div className="px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-0 border-4 border-black">
            <Link
              href={EXAM_HREF.erci}
              className="group relative bg-primary text-black p-8 sm:p-10 border-b-4 border-black sm:border-r-4 sm:border-b-4 xl:border-b-0 xl:border-r-4 transition-all duration-200 hover:scale-[1.02] hover:z-10 hover:shadow-[12px_12px_0_0_black]"
            >
              <div className="font-mono text-sm opacity-50 mb-6">01</div>
              <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2">ERCI</h3>
              <p className="text-lg leading-relaxed mb-8 opacity-90">
                Examen réglementaire canadien sur les investissements. Préparez l&apos;examen ERCI / CIRE.
              </p>
              <div className="flex items-center gap-2 font-black uppercase tracking-wider group-hover:gap-4 transition-all">
                COMMENCER
                <span className="text-2xl">→</span>
              </div>
            </Link>

            <Link
              href={EXAM_HREF.evmcd}
              className="group relative bg-white text-black p-8 sm:p-10 border-b-4 border-black sm:border-b-4 xl:border-b-0 xl:border-r-4 transition-all duration-200 hover:scale-[1.02] hover:z-10 hover:shadow-[12px_12px_0_0_black]"
            >
              <div className="font-mono text-sm opacity-50 mb-6">02</div>
              <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2">EVMCD</h3>
              <p className="text-lg leading-relaxed mb-8 opacity-90">
                Examen sur les valeurs mobilières — clients de détail. Réussir le EVMCD rapidement.
              </p>
              <div className="flex items-center gap-2 font-black uppercase tracking-wider group-hover:gap-4 transition-all">
                COMMENCER
                <span className="text-2xl">→</span>
              </div>
            </Link>

            <div className="relative bg-black text-white p-8 sm:p-10 border-b-4 border-black sm:border-r-4 sm:border-b-0 xl:border-r-4 xl:border-b-0">
              <div className="font-mono text-sm opacity-50 mb-6">03</div>
              <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2">CCVM</h3>
              <p className="text-lg leading-relaxed mb-8 opacity-90">
                Cours sur le commerce des valeurs mobilières au Canada — formation en deux volumes (CSC).
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href={EXAM_HREF.ccvmVol1}
                  className="inline-flex items-center justify-center bg-primary text-black font-black uppercase text-sm tracking-wider px-6 py-4 border-4 border-primary hover:bg-white hover:border-white transition-colors"
                >
                  Volume 1 →
                </Link>
                <Link
                  href={EXAM_HREF.ccvmVol2}
                  className="inline-flex items-center justify-center bg-transparent text-white font-black uppercase text-sm tracking-wider px-6 py-4 border-4 border-white hover:bg-white hover:text-black transition-colors"
                >
                  Volume 2 →
                </Link>
              </div>
            </div>

            <Link
              href={EXAM_HREF.negp}
              className="group relative bg-primary text-black p-8 sm:p-10 border-black border-b-0 transition-all duration-200 hover:scale-[1.02] hover:z-10 hover:shadow-[12px_12px_0_0_black]"
            >
              <div className="font-mono text-sm opacity-50 mb-6">04</div>
              <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2">NEGP</h3>
              <p className="text-lg leading-relaxed mb-8 opacity-90">
                Notions essentielles en gestion de portefeuille — mise à niveau et préparation ciblée.
              </p>
              <div className="flex items-center gap-2 font-black uppercase tracking-wider group-hover:gap-4 transition-all">
                COMMENCER
                <span className="text-2xl">→</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 mt-12">
        <div className="max-w-[1400px] mx-auto">
          <p className="font-mono text-sm text-black/50 uppercase tracking-wider">
            Pas sûr ? <Link href="/formations" className="underline hover:text-primary">Voir toutes les formations</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================
// COMMENT ÇA FONCTIONNE
// ============================================
function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Diagnostic & plan d'étude",
      body: "Nous partons de votre point de départ et de votre date cible pour bâtir un plan réaliste, semaine par semaine.",
    },
    {
      n: "02",
      title: "Apprentissage structuré",
      body: "Modules ordonnés, objectifs clairs et progression mesurable — pas de contenu dispersé ni de révision au hasard.",
    },
    {
      n: "03",
      title: "QCM & examens pratiques",
      body: "Banques de questions à choix multiples et examens blancs chronométrés pour reproduire les conditions réelles.",
    },
    {
      n: "04",
      title: "Accompagnement",
      body: "Questions, clarifications et coaching pour rester motivé et corriger le tir avant l'examen.",
    },
  ];

  return (
    <section className="relative bg-black text-white py-24 sm:py-32 border-t-4 border-white">
      <div className="px-4 sm:px-8 mb-16">
        <div className="max-w-[1400px] mx-auto">
          <span className="font-mono text-sm uppercase tracking-[0.3em] text-white/50 block mb-4">
            [MÉTHODE]
          </span>
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-4">
            COMMENT ÇA
            <br />
            <span className="text-primary">FONCTIONNE</span>
          </h2>
        </div>
      </div>

      <div className="px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-0 border-4 border-white">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className={`p-8 sm:p-10 border-white ${i < 3 ? "border-b-4" : ""} ${i % 2 === 0 ? "md:border-r-4" : ""} ${i < 2 ? "md:border-b-4" : ""}`}
              >
                <div className="font-mono text-sm text-primary mb-4">{step.n}</div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-4">
                  {step.title}
                </h3>
                <p className="text-lg leading-relaxed opacity-85 max-w-xl">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// INVESTISSEURS & ENTREPRENEURS — BIENTÔT
// ============================================
function WaitlistStripSection() {
  return (
    <section className="relative bg-white py-16 sm:py-20 border-t-4 border-black">
      <div className="px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto">
          <span className="font-mono text-sm uppercase tracking-[0.3em] text-black/50 block mb-8 text-center">
            [BIENTÔT DISPONIBLE]
          </span>
          <div className="grid md:grid-cols-2 gap-0 border-4 border-black">
            <Link
              href="/investisseur/waitlist"
              className="group relative bg-white text-black p-8 sm:p-10 border-b-4 md:border-b-0 md:border-r-4 border-black transition-all duration-200 hover:scale-[1.01] hover:z-10 hover:shadow-[8px_8px_0_0_hsl(var(--primary))]"
            >
              <div className="font-mono text-sm opacity-50 mb-4">01</div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">
                INVESTISSEURS
              </h3>
              <div className="text-xs font-mono uppercase tracking-wider opacity-70 mb-4">
                PARTICULIERS
              </div>
              <p className="text-base leading-relaxed mb-6 opacity-90">
                Gérez votre patrimoine. Comprenez les marchés. Prenez des décisions éclairées.
              </p>
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm group-hover:gap-3 transition-all">
                Liste d&apos;attente →
              </div>
            </Link>

            <Link
              href="/entrepreneur/waitlist"
              className="group relative bg-black text-white p-8 sm:p-10 transition-all duration-200 hover:scale-[1.01] hover:z-10 hover:shadow-[8px_8px_0_0_hsl(var(--primary))]"
            >
              <div className="font-mono text-sm opacity-50 mb-4">02</div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">
                ENTREPRENEURS
              </h3>
              <div className="text-xs font-mono uppercase tracking-wider opacity-70 mb-4">
                &amp; DIRIGEANTS
              </div>
              <p className="text-base leading-relaxed mb-6 opacity-90">
                Finance d&apos;entreprise, planification financière, croissance.
              </p>
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-sm group-hover:gap-3 transition-all">
                Liste d&apos;attente →
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 4: ABOUT
// ============================================
function AboutSection() {
  return (
    <section className="relative bg-black text-white py-24 sm:py-32 overflow-hidden border-t-4 border-white">
      <div className="absolute bottom-0 left-0 w-1/2 h-32 bg-primary transform origin-bottom-left skew-y-[-3deg]" />

      <div className="relative px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="font-mono text-sm uppercase tracking-[0.3em] text-white/50 block mb-4">
                [À PROPOS]
              </span>
              <h2 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-8">
                EXPERTISE
                <br />
                <span className="text-primary">DE TERRAIN</span>
              </h2>

              <div className="space-y-6 text-lg leading-relaxed max-w-xl">
                <p>
                  Le Dojo Financier est né de la volonté de démocratiser l&apos;accès à une formation financière de qualité.
                </p>
                <p className="opacity-70">
                  Fondé par des professionnels de l&apos;industrie, notre approche combine rigueur académique et expérience pratique. Notre méthode unique a permis à des centaines de professionnels d&apos;obtenir leurs certifications.
                </p>
              </div>

              <Link
                href="/a-propos"
                className="inline-block mt-10 bg-white text-black font-black uppercase text-sm tracking-wider px-8 py-4 border-4 border-white hover:bg-primary hover:border-primary transition-colors shadow-[6px_6px_0_0_hsl(var(--primary))]"
              >
                En savoir plus →
              </Link>
            </div>

            <div className="relative">
              <div className="border-4 border-white p-8 sm:p-12">
                <div className="space-y-8">
                  <div className="border-b-4 border-white/20 pb-8">
                    <div className="text-8xl sm:text-9xl font-black text-primary leading-none">95%</div>
                    <div className="font-mono text-sm uppercase tracking-wider mt-2">Taux de réussite aux examens</div>
                  </div>
                  <div className="border-b-4 border-white/20 pb-8">
                    <div className="text-8xl sm:text-9xl font-black text-primary leading-none">2500+</div>
                    <div className="font-mono text-sm uppercase tracking-wider mt-2">Étudiants formés</div>
                  </div>
                  <div>
                    <div className="text-8xl sm:text-9xl font-black text-primary leading-none">15+</div>
                    <div className="font-mono text-sm uppercase tracking-wider mt-2">Années d&apos;expertise</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-full h-full border-4 border-primary -z-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION 5: FOOTER
// ============================================
function HomeFooter() {
  const [currentYear, setCurrentYear] = useState(2025);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="home-footer bg-white text-black border-t-4 border-black">
      <div className="px-4 sm:px-8 py-16 sm:py-20">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-1">
              <Link href="/" className="inline-block mb-6">
                <Image
                  src="/logo_dark.png"
                  alt="Le Dojo Financier"
                  width={200}
                  height={50}
                  className="h-auto w-auto max-h-12"
                />
              </Link>
              <p className="text-sm leading-relaxed opacity-70 font-mono">
                Formations, coaching et accompagnement en finance.
              </p>
            </div>

            <div>
              <h3 className="font-black uppercase tracking-wider text-sm mb-6 border-b-4 border-black pb-2 inline-block">
                Formations
              </h3>
              <ul className="space-y-3">
                <li><Link href="/formations/ccvm-pcvm" className="text-sm font-mono hover:text-primary transition-colors">CCVM / CSC</Link></li>
                <li><Link href="/formations/erci" className="text-sm font-mono hover:text-primary transition-colors">ERCI / CIRE</Link></li>
                <li><Link href="/formations" className="text-sm font-mono hover:text-primary transition-colors">Toutes les formations →</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-black uppercase tracking-wider text-sm mb-6 border-b-4 border-black pb-2 inline-block">
                Entreprise
              </h3>
              <ul className="space-y-3">
                <li><Link href="/a-propos" className="text-sm font-mono hover:text-primary transition-colors">À propos</Link></li>
                <li><Link href="/article" className="text-sm font-mono hover:text-primary transition-colors">Publications</Link></li>
                <li><Link href="/contact" className="text-sm font-mono hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-black uppercase tracking-wider text-sm mb-6 border-b-4 border-black pb-2 inline-block">
                Légal
              </h3>
              <ul className="space-y-3">
                <li><Link href="/politique-de-confidentialite" className="text-sm font-mono hover:text-primary transition-colors">Confidentialité</Link></li>
                <li><Link href="/termes-et-conditions" className="text-sm font-mono hover:text-primary transition-colors">Termes</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t-4 border-black">
        <div className="px-4 sm:px-8 py-6">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm font-mono opacity-50">
              © {currentYear} LE DOJO FINANCIER. TOUS DROITS RÉSERVÉS.
            </p>
            <p className="text-sm font-mono opacity-50">
              MONTRÉAL, QUÉBEC
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN CLIENT COMPONENT
// ============================================
export function HomePageClient() {
  return (
    <>
      <main>
        <HeroSection />
        <ExamChoiceSection />
        <HowItWorksSection />
        <WaitlistStripSection />
        <AboutSection />
      </main>
      <HomeFooter />
    </>
  );
}
