import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function TableauDeBordPage() {
  const user = await getCurrentUser();

  if (!user) {
    console.log("[TableauDeBordPage] No user found, redirecting to /login");
    redirect("/login");
  }

  // Redirect based on role
  console.log(`[TableauDeBordPage] User role: ${user.role}, redirecting to appropriate dashboard`);
  if (user.role === "ADMIN") {
    redirect("/tableau-de-bord/admin");
  } else if (user.role === "STUDENT") {
    redirect("/tableau-de-bord/etudiant");
  } else if (user.role === "INSTRUCTOR") {
    redirect("/tableau-de-bord/instructeur");
  } else {
    // Unknown role, redirect to login
    console.error(`[TableauDeBordPage] Unknown user role: ${user.role}`);
    redirect("/login");
  }
}
