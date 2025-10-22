import { QueryClient } from '@tanstack/react-query';

export type AppQueryClient = QueryClient;

export const createQueryClient = (): AppQueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 1,
      },
    },
  });
