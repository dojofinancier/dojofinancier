import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ReactElement } from "react";

interface CohortLearningPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ contentItemId?: string }>;
}

/**
 * Redirect /cohorts/[slug] to /cohorte/[slug] for consistency
 * (Product page already uses /cohorte)
 */
async function CohortLearningRedirect({
  params,
  searchParams,
}: CohortLearningPageProps): Promise<ReactElement> {
  const { slug } = await params;
  const { contentItemId } = await searchParams;

  // Redirect to /cohorte/[slug]/apprendre route (learning interface)
  const queryParams = new URLSearchParams();
  if (contentItemId) queryParams.set("contentItemId", contentItemId);
  
  redirect(`/cohorte/${slug}/apprendre${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);

  // `redirect()` throws and never returns, but this keeps TS happy.
  return <></>;
}

export default function CohortLearningPage(props: CohortLearningPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6">
          <div className="text-muted-foreground">Redirection...</div>
        </div>
      }
    >
      <CohortLearningRedirect {...props} />
    </Suspense>
  );
}
