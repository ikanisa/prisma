export const tokens = {
  // Spacing - Fluid scale
  spacing: {
    xs: 'clamp(0.25rem, 0.5vw, 0.5rem)',
    sm: 'clamp(0.5rem, 1vw, 0.75rem)',
    md: 'clamp(0.75rem, 1.5vw, 1rem)',
    lg: 'clamp(1rem, 2vw, 1.5rem)',
    xl: 'clamp(1.5rem, 3vw, 2rem)',
    '2xl': 'clamp(2rem, 4vw, 3rem)',
  },
  
  // Radius - Consistent roundness
  radius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',
  },
  
  // Shadows - Subtle depth
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
  
  // Transitions - Smooth animations
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
