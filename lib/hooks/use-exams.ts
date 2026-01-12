"use client";

import { useQuery } from "@tanstack/react-query";
import { getAvailableExamsAction } from "@/app/actions/exam-taking";

export function useAvailableExams(courseId: string) {
  return useQuery({
    queryKey: ["available-exams", courseId],
    queryFn: () => getAvailableExamsAction(courseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

