import { requireAdminOrInstructor } from "@/lib/auth/require-auth";
import { AdminDashboardTabs } from "@/components/admin/admin-dashboard-tabs";
import { CohortTabs } from "@/components/admin/cohorts/cohort-tabs";
import { Suspense } from "react";

interface AdminCohortsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

async function AdminCohortsContent({ searchParams }: AdminCohortsPageProps) {
  await requireAdminOrInstructor();
  const { tab } = await searchParams;
  const defaultTab = tab === "create" ? "create" : "list";

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>
      </div>
      
      <AdminDashboardTabs defaultTab="cohorts">
        <div className="mt-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Gestion des cohortes</h2>
            <p className="text-muted-foreground mt-2">
              Créez, modifiez et gérez vos cohortes de coaching de groupe
            </p>
          </div>
          <Suspense fallback={<div className="text-muted-foreground">Chargement des onglets...</div>}>
            <CohortTabs defaultTab={defaultTab} />
          </Suspense>
        </div>
      </AdminDashboardTabs>
    </div>
  );
}

export default function AdminCohortsPage(props: AdminCohortsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      }
    >
      <AdminCohortsContent {...props} />
    </Suspense>
  );
}

