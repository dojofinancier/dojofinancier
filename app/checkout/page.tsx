import { redirect } from "next/navigation";

/**
 * Redirect /checkout to /paiement for backward compatibility
 */
export default function CheckoutPage() {
  redirect("/paiement");
}
