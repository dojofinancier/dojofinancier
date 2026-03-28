import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { Button } from "@/components/ui/button";

/**
 * Instructor hub — linked from /tableau-de-bord and navbars when role is INSTRUCTOR.
 * Without this route, instructors (or anyone sent here by the role router) hit a 404.
 */
export default async function InstructeurDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") {
    redirect("/tableau-de-bord/admin");
  }
  if (user.role === "STUDENT") {
    redirect("/tableau-de-bord/etudiant");
  }
  if (user.role !== "INSTRUCTOR") {
    redirect("/tableau-de-bord");
  }

  return (
    <div className="container mx-auto p-6 max-w-lg">
      <h1 className="text-2xl font-bold">Espace instructeur</h1>
      <p className="text-muted-foreground mt-2">
        Ce tableau de bord dédié est en préparation. Pour toute question, contactez l&apos;administration.
      </p>
      <Button asChild className="mt-6">
        <Link href="/formations">Voir les formations</Link>
      </Button>
    </div>
  );
}
