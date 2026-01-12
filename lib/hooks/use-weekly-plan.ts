"use client";

import { useQuery } from "@tanstack/react-query";
import { getWeeklyStudyPlanAction } from "@/app/actions/study-plan";

export interface WeekData {
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  tasks: Array<{
    type: "LEARN" | "REVIEW" | "PRACTICE";
    description: string;
    moduleId?: string;
    moduleTitle?: string;
    moduleNumber?: number;
    itemCount?: number;
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    isOffPlatform?: boolean;
    entryIds?: string[];
  }>;
  phase: "LEARN" | "REVIEW" | "PRACTICE" | "MIXED";
  estimatedBlocks: number;
  completedTasks: number;
  totalTasks: number;
}

interface WeeklyPlanData {
  weeks: WeekData[];
  week1StartDate: Date | null;
  examDate: Date | null;
}

export function useWeeklyPlan(courseId: string, refreshKey?: number, initialData?: WeeklyPlanData | null) {
  return useQuery({
    queryKey: ["weekly-plan", courseId, refreshKey],
    queryFn: async () => {
      const result = await getWeeklyStudyPlanAction(courseId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch weekly plan");
      }
      return {
        weeks: result.data,
        week1StartDate: result.week1StartDate ? new Date(result.week1StartDate) : null,
        examDate: result.examDate ? new Date(result.examDate) : null,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - plan doesn't change frequently unless explicitly updated
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    initialData: initialData || undefined,
    enabled: !!courseId,
  });
}
