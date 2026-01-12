import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ReactElement } from "react";

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>;
}

/**
 * Redirect /courses/[courseId] to /formations/[courseId] for backward compatibility
 */
async function CourseDetailRedirect({ params }: CourseDetailPageProps): Promise<ReactElement> {
  const { courseId } = await params;
  redirect(`/formations/${courseId}`);

  // `redirect()` throws and never returns, but this keeps TS happy.
  return <></>;
}

export default function CourseDetailPage(props: CourseDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6">
          <div className="text-muted-foreground">Redirection...</div>
        </div>
      }
    >
      <CourseDetailRedirect {...props} />
    </Suspense>
  );
}

