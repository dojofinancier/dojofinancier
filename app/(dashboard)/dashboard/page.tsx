import { redirect } from "next/navigation";

/**
 * Redirect /dashboard to /tableau-de-bord for backward compatibility
 */
export default async function DashboardPage() {
  redirect("/tableau-de-bord");
}
