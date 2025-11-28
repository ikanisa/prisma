import * as React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button
    style={{
      padding: '0.75rem 1.5rem',
      borderRadius: '9999px',
      background: 'linear-gradient(90deg, #7C3AED, #38BDF8)',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
    }}
    {...props}
  >
    {children}
  </button>
);

export { VirtualList } from './VirtualList';
export { LazyRoute } from './LazyRoute';
