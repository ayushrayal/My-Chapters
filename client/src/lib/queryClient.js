import { QueryClient } from '@tanstack/react-query';

/**
 * Central TanStack QueryClient Configuration
 *
 * Defaults:
 * - staleTime: 60s (queries remain fresh for 1 minute before background revalidation)
 * - gcTime: 10m (inactive cache collected after 10 minutes)
 * - retry: Bounded to 1 retry for transient network/server failures; 4xx client errors are never retried
 * - refetchOnWindowFocus: false (avoids disruptive refetches on mobile or tab switches)
 * - refetchOnReconnect: true
 * - refetchOnMount: true (revalidates only if data is stale)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        const status = error?.response?.status || error?.status;
        if (status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true
    },
    mutations: {
      retry: false
    }
  }
});

/**
 * Completely resets and flushes all user/Space cached data on logout or session change.
 */
export function clearUserQueries() {
  queryClient.clear();
}
