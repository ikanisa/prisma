/**
 * Animation System
 * Smooth, performant, accessible animations
 */

import { Variants } from 'framer-motion';

// Easing functions
export const easing = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  sharp: [0.4, 0, 0.6, 1],
  spring: { type: 'spring', stiffness: 300, damping: 30 },
} as const;

// Duration scale
export const duration = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
} as const;

// Page transitions
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: duration.normal, ease: easing.easeOut } 
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    transition: { duration: duration.fast, ease: easing.easeIn } 
  },
};

// Fade in/out
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: duration.normal } 
  },
  exit: { 
    opacity: 0, 
    transition: { duration: duration.fast } 
  },
};

// Slide up
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: duration.normal, ease: easing.easeOut } 
  },
};

// Scale
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: duration.fast, ease: easing.easeOut } 
  },
};

// Stagger children
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// List item
export const staggerItem: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: duration.fast, ease: easing.easeOut }
  },
};

// Skeleton loading shimmer
export const shimmerVariants: Variants = {
  initial: { backgroundPosition: '200% 0' },
  animate: {
    backgroundPosition: '-200% 0',
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Hover scale
export const hoverScale = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02, 
    transition: { duration: duration.fast, ease: easing.easeOut } 
  },
  tap: { scale: 0.98 },
};

// Modal/Dialog
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: duration.normal, ease: easing.easeOut } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: duration.fast, ease: easing.easeIn } 
  },
};

// Drawer (slide from side)
export const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: { 
    x: 0, 
    transition: { duration: duration.normal, ease: easing.easeOut } 
  },
  exit: { 
    x: '100%', 
    transition: { duration: duration.normal, ease: easing.easeIn } 
  },
};

// Toast notification
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.3 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: duration.normal, ease: easing.spring } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.5,
    transition: { duration: duration.fast } 
  },
};
