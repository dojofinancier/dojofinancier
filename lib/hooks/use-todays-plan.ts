"use client";

import { useQuery } from "@tanstack/react-query";
import { getTodaysPlanAction } from "@/app/actions/study-plan";

interface TodaysPlanData {
  sections: {
    sessionCourte: any[];
    sessionLongue: any[];
    sessionCourteSupplementaire: any[];
    sessionLongueSupplementaire: any[];
  };
  totalBlocks: number;
  phase1Module: { id: string; title: string; order: number } | null;
}

export function useTodaysPlan(courseId: string, initialData?: TodaysPlanData | null) {
  // Include today's date in the query key so cache invalidates daily
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  return useQuery({
    queryKey: ["todays-plan", courseId, today],
    queryFn: async () => {
      const result = await getTodaysPlanAction(courseId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch today's plan");
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - plan doesn't change during the day unless explicitly updated
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    initialData: initialData || undefined,
    enabled: !!courseId,
  });
}
