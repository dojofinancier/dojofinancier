"use client";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      await logoutAction();
      toast.success("Déconnexion réussie");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  return (
    <Button variant="outline" onClick={handleLogout}>
      Se déconnecter
    </Button>
  );
}

