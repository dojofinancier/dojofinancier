import { redirect } from "next/navigation";

/**
 * Redirect /dashboard/profile to /tableau-de-bord/profil for backward compatibility
 */
export default async function ProfilePage() {
  redirect("/tableau-de-bord/profil");
}
