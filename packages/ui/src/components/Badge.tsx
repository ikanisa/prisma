import * as React from 'react';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'destructive';
};

const VARIANTS: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-900 text-white',
  secondary: 'bg-gray-100 text-gray-900',
  destructive: 'bg-red-600 text-white',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className = '', variant = 'default', ...props },
  ref,
) {
  const variantClass = VARIANTS[variant] || VARIANTS.default;
  return <span ref={ref} className={`inline-flex items-center rounded px-2 py-1 text-xs ${variantClass} ${className}`} {...props} />;
});

export default Badge;
