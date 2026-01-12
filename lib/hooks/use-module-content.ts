"use client";

import { useQuery } from "@tanstack/react-query";
import { getModuleContentAction, getBatchModuleContentAction } from "@/app/actions/module-content";

export function useModuleContent(moduleId: string) {
  return useQuery({
    queryKey: ["module-content", moduleId],
    queryFn: () => getModuleContentAction(moduleId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!moduleId,
  });
}

export function useBatchModuleContent(moduleIds: string[]) {
  return useQuery({
    queryKey: ["batch-module-content", moduleIds.sort().join(",")],
    queryFn: () => getBatchModuleContentAction(moduleIds),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: moduleIds.length > 0,
  });
}

