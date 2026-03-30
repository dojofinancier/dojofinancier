import { Metadata } from "next";
import { WaitlistPageClient } from "./waitlist-page-client";
import { absoluteUrl, siteOpenGraphDefaults, siteTwitterDefaults } from "@/lib/seo/metadata-helpers";

const TITLE = "Liste d'attente — Investisseurs";
const DESCRIPTION =
  "Rejoignez la liste d'attente pour être informé du lancement de nos formations pour investisseurs.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/investisseur/waitlist" },
  openGraph: {
    ...siteOpenGraphDefaults(),
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/investisseur/waitlist"),
  },
  twitter: {
    ...siteTwitterDefaults(),
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function InvestisseurWaitlistPage() {
  return <WaitlistPageClient type="investisseur" />;
}
