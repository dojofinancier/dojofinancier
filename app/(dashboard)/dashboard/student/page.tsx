import { redirect } from "next/navigation";

/**
 * Redirect /dashboard/student to /tableau-de-bord/etudiant for backward compatibility
 */
export default async function StudentDashboardPage() {
  redirect("/tableau-de-bord/etudiant");
}
