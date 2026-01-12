"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Optimized for performance: longer staleTime means fewer refetches
            // Data stays fresh for 5 minutes, reducing unnecessary network requests
            staleTime: 5 * 60 * 1000, // 5 minutes (increased from 1 minute)
            
            // Keep data in cache for 30 minutes (increased from 5 minutes)
            // This allows instant navigation back to previously visited pages
            gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
            
            // Don't refetch on window focus - reduces unnecessary requests
            refetchOnWindowFocus: false,
            
            // Don't refetch on mount if data is still fresh
            refetchOnMount: false,
            
            // Refetch when connection is restored (good for offline support)
            refetchOnReconnect: true,
            
            // Retry failed requests once
            retry: 1,
            
            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools hidden on localhost - uncomment to enable */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

