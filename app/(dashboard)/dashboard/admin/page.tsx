import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ReactElement } from "react";

interface AdminDashboardPageProps {
  searchParams: Promise<{ tab?: string }>;
}

/**
 * Redirect /dashboard/admin to /tableau-de-bord/admin for backward compatibility
 */
async function AdminDashboardRedirect({ searchParams }: AdminDashboardPageProps): Promise<ReactElement> {
  const { tab } = await searchParams;
  const params = tab ? `?tab=${tab}` : "";
  redirect(`/tableau-de-bord/admin${params}`);

  // `redirect()` throws and never returns, but this keeps TS happy.
  return <></>;
}

export default function AdminDashboardPage(props: AdminDashboardPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6">
          <div className="text-muted-foreground">Redirection...</div>
        </div>
      }
    >
      <AdminDashboardRedirect {...props} />
    </Suspense>
  );
}
