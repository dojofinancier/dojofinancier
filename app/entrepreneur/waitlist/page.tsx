import { Metadata } from "next";
import { WaitlistPageClient } from "@/app/investisseur/waitlist/waitlist-page-client";
import { absoluteUrl, siteOpenGraphDefaults, siteTwitterDefaults } from "@/lib/seo/metadata-helpers";

const TITLE = "Liste d'attente — Entrepreneurs";
const DESCRIPTION =
  "Rejoignez la liste d'attente pour être informé du lancement de nos formations pour entrepreneurs.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/entrepreneur/waitlist" },
  openGraph: {
    ...siteOpenGraphDefaults(),
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/entrepreneur/waitlist"),
  },
  twitter: {
    ...siteTwitterDefaults(),
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function EntrepreneurWaitlistPage() {
  return <WaitlistPageClient type="entrepreneur" />;
}
