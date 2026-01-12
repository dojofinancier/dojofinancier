import { requireAdmin } from "@/lib/auth/require-auth";
import { AnalyticsDashboard } from "@/components/admin/analytics/analytics-dashboard";

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tableau de bord analytique</h1>
        <p className="text-muted-foreground mt-2">
          Métriques d'inscription, taux de complétion et engagement
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}

