import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import type { ReactElement } from "react";

interface CourseLearningPageProps {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ contentItemId?: string; module?: string; tab?: string }>;
}

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function CourseLearningContent({
  params,
  searchParams,
}: CourseLearningPageProps): Promise<ReactElement> {
  const { courseId } = await params;
  const { contentItemId, module, tab } = await searchParams;

  try {
    let slug: string;

    if (isUUID(courseId)) {
      // It's a UUID, look up the course to get the slug
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { slug: true },
      });
      
      if (!course || !course.slug) {
        // Fallback: redirect to formations page with UUID
        const queryParams = new URLSearchParams();
        if (contentItemId) queryParams.set("contentItemId", contentItemId);
        if (module) queryParams.set("module", module);
        if (tab) queryParams.set("tab", tab);
        redirect(`/formations/${courseId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
      }
      
      slug = course.slug;
    } else {
      // It's already a slug
      slug = courseId;
    }

    // Build redirect URL with query parameters
    const queryParams = new URLSearchParams();
    if (contentItemId) queryParams.set("contentItemId", contentItemId);
    if (module) queryParams.set("module", module);
    if (tab) queryParams.set("tab", tab);
    
    const redirectUrl = `/apprendre/${slug}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    redirect(redirectUrl);
  } catch (error) {
    console.error("Error redirecting /learn route:", error);
    // Fallback redirect
    redirect(`/formations/${courseId}`);
  }

  // `redirect()` throws and never returns, but this keeps TS happy.
  return <></>;
}

/**
 * Redirect /learn/[courseId] to /apprendre/[slug] for backward compatibility
 * Supports both UUID and slug lookups
 */
export default function CourseLearningPage(props: CourseLearningPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6">
          <div className="text-muted-foreground">Redirection...</div>
        </div>
      }
    >
      <CourseLearningContent {...props} />
    </Suspense>
  );
}
