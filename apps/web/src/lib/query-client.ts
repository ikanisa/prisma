import { QueryClient } from '@tanstack/react-query';

type QueryClientFactory = () => QueryClient;

export const createQueryClient: QueryClientFactory = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 1,
      },
    },
  });
