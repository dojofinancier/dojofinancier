import { getCurrentUser } from "@/lib/auth/get-current-user";
import { BrutalistNavbarClient } from "./brutalist-navbar-client";

interface BrutalistNavbarProps {
  variant?: "transparent" | "solid";
}

export async function BrutalistNavbar({ variant = "transparent" }: BrutalistNavbarProps) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // Silently fail - show logged out state if user fetch fails
    user = null;
  }

  // Serialize user object for client component
  const serializedUser = user ? {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  } : null;

  // Determine dashboard URL based on role
  const getDashboardUrl = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '/tableau-de-bord/admin';
      case 'STUDENT':
        return '/tableau-de-bord/etudiant';
      case 'INSTRUCTOR':
        return '/tableau-de-bord/instructeur';
      default:
        return '/tableau-de-bord';
    }
  };

  return (
    <BrutalistNavbarClient
      user={serializedUser}
      variant={variant}
      dashboardUrl={serializedUser ? getDashboardUrl(serializedUser.role) : null}
    />
  );
}

