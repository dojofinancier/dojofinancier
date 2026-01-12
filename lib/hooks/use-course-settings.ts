"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserCourseSettingsAction } from "@/app/actions/study-plan";

/**
 * React Query hook for fetching user course settings
 * Automatically handles caching, deduplication, and background refetching
 */
export function useCourseSettings(courseId: string, initialSettings?: any) {
  return useQuery({
    queryKey: ["course-settings", courseId],
    queryFn: async () => {
      const result = await getUserCourseSettingsAction(courseId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch course settings");
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    initialData: initialSettings, // Use server-provided data if available
    enabled: !!courseId, // Only fetch if courseId is provided
  });
}
