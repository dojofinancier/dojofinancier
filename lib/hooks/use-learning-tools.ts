"use client";

import { useQuery } from "@tanstack/react-query";
import { getCourseAction } from "@/app/actions/courses";
import { getCaseStudiesAction } from "@/app/actions/case-studies";

/**
 * React Query hook for fetching learning tools visibility data
 * Combines course componentVisibility with case studies availability
 *
 * Benefits:
 * - Caches course data to avoid refetching on tab switches
 * - Deduplicates requests when rapidly navigating
 * - Shared cache with other components that need course data
 */
export function useLearningToolsData(courseId: string) {
  // Fetch course data with component visibility
  const courseQuery = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const result = await getCourseAction(courseId);
      if (!result) {
        throw new Error("Failed to fetch course");
      }
      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - course data rarely changes
    gcTime: 30 * 60 * 1000,
    enabled: !!courseId,
  });

  // Fetch case studies availability
  const caseStudiesQuery = useQuery({
    queryKey: ["case-studies-availability", courseId],
    queryFn: async () => {
      const result = await getCaseStudiesAction(courseId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch case studies");
      }
      return (result.data?.length ?? 0) > 0;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
    enabled: !!courseId,
  });

  const isLoading = courseQuery.isLoading || caseStudiesQuery.isLoading;
  const course = courseQuery.data;
  const hasCaseStudies = caseStudiesQuery.data ?? false;

  // Derive visibility settings - cast to record type for safe property access
  const componentVisibility = (course?.componentVisibility || {}) as Record<string, boolean | undefined>;

  return {
    isLoading,
    course,
    hasCaseStudies,
    visibility: {
      videos: course ? componentVisibility.videos !== false : false,
      notes: course ? componentVisibility.notes !== false : false,
      quizzes: course ? componentVisibility.quizzes !== false : false,
      flashcards: course ? componentVisibility.flashcards !== false : false,
      caseStudies: hasCaseStudies,
    },
  };
}
