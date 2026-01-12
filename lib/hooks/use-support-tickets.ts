"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupportTicketsAction } from "@/app/actions/support-tickets";

export function useSupportTickets(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  assignedAdminId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["support-tickets", params],
    queryFn: () => getSupportTicketsAction(params || {}),
    staleTime: 2 * 60 * 1000, // 2 minutes - tickets can change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for quick revisits
    refetchOnMount: false, // Don't refetch if data is still fresh
  });
}
