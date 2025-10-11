/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Enhanced variants using our design system
        gradient: "bg-gradient-primary text-primary-foreground hover:opacity-90 hover:scale-105 transition-all duration-200",
        glow: "bg-gradient-glow text-white hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-primary",
        glass: "glass text-foreground hover:bg-white/20 backdrop-blur-md border-white/20",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
        floating: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-elegant hover:shadow-primary hover:-translate-y-1 transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        fab: "h-14 w-14 rounded-full", // Floating Action Button
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, ...props }, ref) => {
    
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    
    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        whileHover={{ scale: variant?.includes('gradient') || variant?.includes('glow') || variant === 'floating' ? 1.02 : 1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        disabled={loading}
        {...(props as any)}
      >
        {loading ? (
          <>
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            Loading...
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
