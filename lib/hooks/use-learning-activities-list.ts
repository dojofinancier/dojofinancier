"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentLearningActivitiesWithAttemptsAction } from "@/app/actions/learning-activities-optimized";
import { getCourseModulesAction } from "@/app/actions/modules";

export function useLearningActivitiesList(courseId: string) {
  const activitiesQuery = useQuery({
    queryKey: ["learning-activities", courseId],
    queryFn: () => getStudentLearningActivitiesWithAttemptsAction(courseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const modulesQuery = useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: () => getCourseModulesAction(courseId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    activities: activitiesQuery.data,
    modules: modulesQuery.data,
    isLoading: activitiesQuery.isLoading || modulesQuery.isLoading,
    error: activitiesQuery.error || modulesQuery.error,
  };
}

