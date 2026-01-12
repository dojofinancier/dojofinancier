import { redirect } from "next/navigation";

/**
 * Redirect /dashboard/payments to /tableau-de-bord/paiements for backward compatibility
 */
export default async function PaymentHistoryPage() {
  redirect("/tableau-de-bord/paiements");
}
