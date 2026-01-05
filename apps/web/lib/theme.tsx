/**
 * Theme System
 * 
 * Provides light/dark mode theme management with ChatKit-compatible theming
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

export interface ChatKitTheme {
  colorScheme: 'light' | 'dark' | 'auto';
  color: {
    accent: {
      primary: string;
      level: number;
    };
  };
  radius: 'round' | 'square';
  density: 'compact' | 'normal' | 'comfortable';
  typography: {
    fontFamily: string;
  };
}

const defaultTheme: ChatKitTheme = {
  colorScheme: 'auto',
  color: {
    accent: {
      primary: '#4A90E2',
      level: 2,
    },
  },
  radius: 'round',
  density: 'normal',
  typography: {
    fontFamily: 'Inter, sans-serif',
  },
};

interface ThemeContextType {
  theme: ChatKitTheme;
  setTheme: (theme: Partial<ChatKitTheme>) => void;
  isDark: boolean;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, initialTheme }: { children: React.ReactNode; initialTheme?: Partial<ChatKitTheme> }) {
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme();
  const [chatKitTheme, setChatKitTheme] = useState<ChatKitTheme>({
    ...defaultTheme,
    ...initialTheme,
  });

  const isDark = chatKitTheme.colorScheme === 'dark' || 
                 (chatKitTheme.colorScheme === 'auto' && nextTheme === 'dark');

  useEffect(() => {
    if (chatKitTheme.colorScheme === 'dark') {
      setNextTheme('dark');
    } else if (chatKitTheme.colorScheme === 'light') {
      setNextTheme('light');
    }
  }, [chatKitTheme.colorScheme, setNextTheme]);

  const setTheme = (updates: Partial<ChatKitTheme>) => {
    setChatKitTheme(prev => ({ ...prev, ...updates }));
  };

  const toggleColorScheme = () => {
    const newScheme = chatKitTheme.colorScheme === 'light' ? 'dark' : 
                     chatKitTheme.colorScheme === 'dark' ? 'auto' : 'light';
    setTheme({ colorScheme: newScheme });
  };

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--chatkit-primary', chatKitTheme.color.accent.primary);
    root.style.setProperty('--chatkit-radius', chatKitTheme.radius === 'round' ? '9999px' : '0.375rem');
    root.style.setProperty('--chatkit-font-family', chatKitTheme.typography.fontFamily);
    
    const densityMap = {
      compact: '0.75rem',
      normal: '1rem',
      comfortable: '1.25rem',
    };
    root.style.setProperty('--chatkit-spacing', densityMap[chatKitTheme.density]);
  }, [chatKitTheme]);

  return (
    <ThemeContext.Provider value={{ theme: chatKitTheme, setTheme, isDark, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useChatKitTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useChatKitTheme must be used within ThemeProvider');
  }
  return context;
}

/**
 * Theme-aware component wrapper
 */
export function ThemedComponent({ 
  children, 
  theme: componentTheme 
}: { 
  children: React.ReactNode; 
  theme?: 'light' | 'dark';
}) {
  const { isDark } = useChatKitTheme();
  const effectiveTheme = componentTheme || (isDark ? 'dark' : 'light');

  return (
    <div data-theme={effectiveTheme} className={effectiveTheme === 'dark' ? 'dark' : ''}>
      {children}
    </div>
  );
}

