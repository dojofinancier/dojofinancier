"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Custom hook for prefetching routes and data on hover
 * This dramatically improves perceived navigation speed
 * 
 * @param href - The route to prefetch
 * @param prefetchData - Optional function to prefetch data for the route
 * @returns Event handlers for mouse enter
 */
export function usePrefetchOnHover<T = unknown>(
  href: string,
  prefetchData?: () => Promise<T> | T,
  queryKey?: string[]
) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleMouseEnter = useCallback(() => {
    // Prefetch the route (Next.js will prefetch the page bundle)
    router.prefetch(href);

    // If a data prefetch function is provided, prefetch the data
    if (prefetchData && queryKey) {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          const result = await prefetchData();
          return result;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - same as default
      });
    }
  }, [href, prefetchData, queryKey, router, queryClient]);

  return {
    onMouseEnter: handleMouseEnter,
  };
}
