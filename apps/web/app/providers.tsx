'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { ThemeProvider as ChatKitThemeProvider } from '@/lib/theme';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/components/features/auth/auth-provider';
import { CommandProvider, CommandPalette, CommandKeyListener } from '@/components/features/command';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ChatKitThemeProvider>
          <AuthProvider>
            <CommandProvider>
              <CommandKeyListener />
              <CommandPalette />
              {children}
            </CommandProvider>
          </AuthProvider>
        </ChatKitThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
