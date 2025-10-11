import * as React from 'react';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  ghost: 'bg-transparent hover:bg-gray-50 text-gray-900',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = '', variant = 'primary', ...props },
  ref,
) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${variantClass} ${className}`}
      {...props}
    />
  );
});

export default Button;
