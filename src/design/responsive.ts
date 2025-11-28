/**
 * Responsive Design System
 * Mobile-first fluid breakpoints and utilities
 */

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs}px)`,
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
} as const;

export const fluidSpacing = {
  // Fluid spacing using clamp (min, preferred, max)
  xs: 'clamp(0.25rem, 0.5vw, 0.5rem)',    // 4-8px
  sm: 'clamp(0.5rem, 1vw, 1rem)',         // 8-16px
  md: 'clamp(1rem, 2vw, 1.5rem)',         // 16-24px
  lg: 'clamp(1.5rem, 3vw, 2rem)',         // 24-32px
  xl: 'clamp(2rem, 4vw, 3rem)',           // 32-48px
  '2xl': 'clamp(3rem, 6vw, 4rem)',        // 48-64px
} as const;

export const containerSizes = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  full: '100%',
} as const;

export const fluidContainer = {
  // Fluid container with padding
  width: '100%',
  maxWidth: 'min(90%, 1280px)',
  marginInline: 'auto',
  paddingInline: 'clamp(1rem, 5vw, 3rem)',
} as const;

export const gridTemplates = {
  auto: 'repeat(auto-fit, minmax(250px, 1fr))',
  responsive2: 'repeat(auto-fit, minmax(300px, 1fr))',
  responsive3: 'repeat(auto-fit, minmax(250px, 1fr))',
  responsive4: 'repeat(auto-fit, minmax(200px, 1fr))',
} as const;
