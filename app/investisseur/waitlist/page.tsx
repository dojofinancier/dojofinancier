import { Metadata } from "next";
import { WaitlistPageClient } from "./waitlist-page-client";

export const metadata: Metadata = {
  title: "Liste d'attente — Investisseurs | Le Dojo Financier",
  description: "Rejoignez la liste d'attente pour être informé du lancement de nos formations pour investisseurs.",
};

export default function InvestisseurWaitlistPage() {
  return <WaitlistPageClient type="investisseur" />;
}
