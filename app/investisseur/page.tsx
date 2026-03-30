import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { absoluteUrl, siteOpenGraphDefaults, siteTwitterDefaults } from "@/lib/seo/metadata-helpers";

const TITLE = "Diagnostic investisseur";
const DESCRIPTION =
  "Un diagnostic court et structuré pour clarifier ta manière de décider en investissement.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/investisseur" },
  openGraph: {
    ...siteOpenGraphDefaults(),
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/investisseur"),
  },
  twitter: {
    ...siteTwitterDefaults(),
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function InvestisseurLandingPage() {
  const resonance = [
    "Tu investis déjà, mais tu consommes trop d’information contradictoire",
    "Tu ne sais plus quoi est réellement important à long terme",
    "Tu fais confiance à un conseiller, sans toujours comprendre tes décisions",
    "Tu passes du temps à optimiser des détails, sans vision d’ensemble",
    "Tu veux investir sérieusement, sans tomber dans le bruit et les promesses",
  ];

  const helps = [
    "Identifier comment tu prends tes décisions d’investissement",
    "Mettre le doigt sur ton principal point de friction",
    "Comprendre ce qui mérite ton attention maintenant",
    "Savoir quoi ignorer, au moins pour l’instant",
  ];

  const notThis = ["Un quiz de personnalité", "Un conseil d’investissement", "Une promesse de rendement"];

  const forWho = [
    "Ont déjà commencé à investir",
    "Ont une formation universitaire ou un esprit analytique",
    "Veulent comprendre avant d’optimiser",
    "Préférent la rigueur aux promesses",
    "Investissent au Québec ou au Canada",
  ];

  const notForWho = ["Des “trucs rapides”", "Des prédictions de marché", "Des rendements garantis"];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fbf7f2] text-neutral-900">
      {/* Simple standalone header (default navbar is hidden via RouteChrome) */}
      <header className="sticky top-0 z-10 border-b border-black/10 bg-[#fbf7f2]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="font-black tracking-tight">
            LE DOJO FINANCIER
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="font-semibold">
              <Link href="/formations">Formations</Link>
            </Button>
            <Button asChild className="font-semibold">
              <Link href="/investisseur/questionnaire">Faire le diagnostic</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="px-4 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              <div>
                <p className="mb-4 inline-flex items-center rounded-full border border-black/10 bg-white/60 px-3 py-1 text-xs font-semibold tracking-wide">
                  Diagnostic de clarté investisseur (≈ 5 minutes)
                </p>
                <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                  Tu n’as pas besoin de plus d’information pour investir mieux.
                  <br />
                  <span className="underline decoration-primary/60 decoration-4 underline-offset-4">Tu as besoin d’un cadre.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-800">
                  La majorité des investisseurs intelligents n’échouent pas par manque de connaissances, mais parce qu’ils
                  optimisent trop tôt… sans structure claire.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="font-semibold">
                    <Link href="/investisseur/questionnaire">👉 Faire le Diagnostic Investisseur</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="border-black/15 bg-white/60 font-semibold">
                    <Link href="#comment-ca-marche">Comment ça fonctionne</Link>
                  </Button>
                </div>
                <p className="mt-3 text-sm text-neutral-700">Gratuit · éducatif seulement · aucune promesse</p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold tracking-tight">Ce que tu vas obtenir</h2>
                <ul className="mt-4 space-y-3 text-neutral-800">
                  {helps.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-xl border border-black/10 bg-[#fbf7f2] p-4">
                  <p className="font-semibold">Ce n’est pas :</p>
                  <ul className="mt-2 space-y-1 text-sm text-neutral-800">
                    {notThis.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm font-semibold text-neutral-900">C’est un outil de lucidité.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RESONANCE */}
        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-6 sm:p-10">
              <h2 className="text-2xl font-black tracking-tight">Si tu te reconnais ici, ce diagnostic est pour toi</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {resonance.map((item) => (
                  <div key={item} className="rounded-xl border border-black/10 bg-white p-4">
                    <p className="text-neutral-900">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-xl bg-[#fbf7f2] p-5">
                <p className="font-semibold">👉 Le problème n’est pas ton intelligence.</p>
                <p className="font-semibold">👉 Le problème, c’est l’absence d’un cadre décisionnel clair.</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="comment-ca-marche" className="px-4 pb-14 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-white/70 p-6 sm:p-8">
                <h3 className="text-lg font-black tracking-tight">Comment ça fonctionne</h3>
                <ol className="mt-4 space-y-3 text-neutral-800">
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      1
                    </span>
                    <span>Tu réponds à 6 questions simples</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      2
                    </span>
                    <span>On analyse ta manière de décider (pas tes produits)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      3
                    </span>
                    <span>Tu obtiens des recommandations claires et actionnables</span>
                  </li>
                </ol>
                <p className="mt-5 text-sm text-neutral-700">⏱ Temps requis : environ 5 minutes.</p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/70 p-6 sm:p-8 lg:col-span-2">
                <h3 className="text-lg font-black tracking-tight">À qui ça s’adresse</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-black/10 bg-white p-5">
                    <p className="font-semibold">Idéal si tu :</p>
                    <ul className="mt-3 space-y-2 text-sm text-neutral-800">
                      {forWho.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-white p-5">
                    <p className="font-semibold">Si tu cherches :</p>
                    <ul className="mt-3 space-y-2 text-sm text-neutral-800">
                      {notForWho.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-neutral-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-sm font-semibold text-neutral-900">👉 Ce diagnostic n’est probablement pas pour toi.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-black/10 bg-white/70 p-6 sm:p-10">
              <h3 className="text-lg font-black tracking-tight">Crédibilité (sans ego)</h3>
              <p className="mt-3 text-neutral-800">
                Ce site est conçu par un formateur en finance spécialisé dans l’éducation financière rigoureuse, la prise de
                décision en contexte d’incertitude, et la compréhension réelle du risque.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-neutral-800">
                <span className="rounded-full border border-black/10 bg-white px-3 py-1">Aucune affiliation</span>
                <span className="rounded-full border border-black/10 bg-white px-3 py-1">Aucune commission</span>
                <span className="rounded-full border border-black/10 bg-white px-3 py-1">Aucun conflit d’intérêt</span>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl border border-black/10 bg-neutral-900 p-8 text-white sm:p-12">
              <h2 className="text-3xl font-black tracking-tight">Avant d’optimiser tes placements, clarifie ta manière de décider.</h2>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="font-semibold">
                  <Link href="/investisseur/questionnaire">👉 Commencer le Diagnostic Investisseur</Link>
                </Button>
                <p className="text-sm text-white/70">(gratuit · éducatif · sans promesse)</p>
              </div>
              <div className="mt-8 rounded-xl bg-white/5 p-5 text-sm text-white/80">
                <p className="font-semibold text-white">Important</p>
                <p className="mt-2">
                  Le Diagnostic Investisseur est un outil éducatif. Il ne constitue pas un conseil d’investissement, une
                  recommandation personnalisée ou une opinion sur un titre, un produit ou une stratégie spécifique.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

