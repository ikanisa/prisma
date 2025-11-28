import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useResponsive() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);

      let newBreakpoint: Breakpoint = 'xs';
      for (const [bp, minWidth] of Object.entries(breakpoints)) {
        if (width >= minWidth) {
          newBreakpoint = bp as Breakpoint;
        }
      }
      setCurrentBreakpoint(newBreakpoint);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAbove = (breakpoint: Breakpoint) => windowWidth >= breakpoints[breakpoint];
  const isBelow = (breakpoint: Breakpoint) => windowWidth < breakpoints[breakpoint];
  const isBetween = (min: Breakpoint, max: Breakpoint) =>
    windowWidth >= breakpoints[min] && windowWidth < breakpoints[max];

  return {
    breakpoint: currentBreakpoint,
    width: windowWidth,
    isAbove,
    isBelow,
    isBetween,
    isMobile: windowWidth < breakpoints.md,
    isTablet: isBetween('md', 'lg'),
    isDesktop: windowWidth >= breakpoints.lg,
  };
}
