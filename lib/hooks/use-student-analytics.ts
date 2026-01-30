"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getStudentOverviewAction,
  getStudentProgressAction,
  getStudentPerformanceAction,
  getStudentStudyHabitsAction,
  getStudentGoalsAction,
} from "@/app/actions/student-analytics";

/**
 * React Query hooks for student analytics data
 * Provides automatic caching, deduplication, and stale-while-revalidate
 *
 * Benefits:
 * - Data persists across tab switches (no refetch)
 * - Automatic request deduplication (rapid clicks don't cause multiple requests)
 * - Background refetching after stale time
 * - Shared cache across components
 */

const ANALYTICS_STALE_TIME = 5 * 60 * 1000; // 5 minutes - analytics data doesn't need real-time updates
const ANALYTICS_GC_TIME = 30 * 60 * 1000; // 30 minutes - keep in cache longer

/**
 * Hook for fetching student overview data
 * This is typically loaded first when entering the analytics section
 */
export function useStudentOverview(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["student-analytics", "overview", courseId],
    queryFn: async () => {
      const result = await getStudentOverviewAction(courseId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch overview data");
      }
      return result.data;
    },
    staleTime: ANALYTICS_STALE_TIME,
    gcTime: ANALYTICS_GC_TIME,
    enabled: !!courseId && enabled,
  });
}

/**
 * Hook for fetching student progress data
 * Only fetches when the progress tab is active
 */
export function useStudentProgress(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["student-analytics", "progress", courseId],
    queryFn: async () => {
      const result = await getStudentProgressAction(courseId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch progress data");
      }
      return result.data;
    },
    staleTime: ANALYTICS_STALE_TIME,
    gcTime: ANALYTICS_GC_TIME,
    enabled: !!courseId && enabled,
  });
}

/**
 * Hook for fetching student performance data
 * Only fetches when the performance tab is active
 */
export function useStudentPerformance(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["student-analytics", "performance", courseId],
    queryFn: async () => {
      const result = await getStudentPerformanceAction(courseId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch performance data");
      }
      return result.data;
    },
    staleTime: ANALYTICS_STALE_TIME,
    gcTime: ANALYTICS_GC_TIME,
    enabled: !!courseId && enabled,
  });
}

/**
 * Hook for fetching student study habits data
 * Only fetches when the habits tab is active
 */
export function useStudentStudyHabits(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["student-analytics", "habits", courseId],
    queryFn: async () => {
      const result = await getStudentStudyHabitsAction(courseId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch study habits data");
      }
      return result.data;
    },
    staleTime: ANALYTICS_STALE_TIME,
    gcTime: ANALYTICS_GC_TIME,
    enabled: !!courseId && enabled,
  });
}

/**
 * Hook for fetching student goals data
 * Only fetches when the goals tab is active
 */
export function useStudentGoals(courseId: string, enabled = true) {
  return useQuery({
    queryKey: ["student-analytics", "goals", courseId],
    queryFn: async () => {
      const result = await getStudentGoalsAction(courseId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch goals data");
      }
      return result.data;
    },
    staleTime: ANALYTICS_STALE_TIME,
    gcTime: ANALYTICS_GC_TIME,
    enabled: !!courseId && enabled,
  });
}
