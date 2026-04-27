import { redirect } from "next/navigation";

export default function AccompagnementPage() {
  redirect("/tableau-de-bord/etudiant?tab=accompagnement");
}
