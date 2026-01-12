import { requireStudent } from "@/lib/auth/require-auth";
import { notFound, redirect } from "next/navigation";
import { AskQuestionPage } from "@/components/course/ask-question-page";
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";

interface AskQuestionPageProps {
  params: Promise<{ courseId: string }>;
}

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function AskQuestionRouteContent({ params }: AskQuestionPageProps) {
  const { courseId } = await params;
  const user = await requireStudent();

  try {
    // Determine if courseId is a UUID or a slug
    let actualCourseId: string;

    if (isUUID(courseId)) {
      actualCourseId = courseId;
    } else {
      // It's a slug, look up the course to get the ID
      const { getPublishedCourseBySlugAction } = await import("@/app/actions/courses");
      const courseBySlug = await getPublishedCourseBySlugAction(courseId);
      if (!courseBySlug) {
        notFound();
      }
      actualCourseId = courseBySlug.id;
    }

    // Verify user is enrolled
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: actualCourseId,
        expiresAt: { gte: new Date() },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!enrollment) {
      redirect(`/learn/${courseId}`);
    }

    return (
      <AskQuestionPage
        courseId={actualCourseId}
        courseTitle={enrollment.course.title}
      />
    );
  } catch (error) {
    console.error("Error in AskQuestionRoute:", error);
    notFound();
  }
}

export default function AskQuestionRoute(props: AskQuestionPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      }
    >
      <AskQuestionRouteContent {...props} />
    </Suspense>
  );
}


