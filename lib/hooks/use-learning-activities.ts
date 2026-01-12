"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentLearningActivitiesWithAttemptsAction } from "@/app/actions/learning-activities-optimized";
import { getCourseModulesAction } from "@/app/actions/modules";

export function useLearningActivities(courseId: string) {
  return useQuery({
    queryKey: ["learning-activities", courseId],
    queryFn: () => getStudentLearningActivitiesWithAttemptsAction(courseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCourseModules(courseId: string) {
  return useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: () => getCourseModulesAction(courseId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

