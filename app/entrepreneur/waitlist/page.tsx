import { Metadata } from "next";
import { WaitlistPageClient } from "@/app/investisseur/waitlist/waitlist-page-client";

export const metadata: Metadata = {
  title: "Liste d'attente — Entrepreneurs | Le Dojo Financier",
  description: "Rejoignez la liste d'attente pour être informé du lancement de nos formations pour entrepreneurs.",
};

export default function EntrepreneurWaitlistPage() {
  return <WaitlistPageClient type="entrepreneur" />;
}
