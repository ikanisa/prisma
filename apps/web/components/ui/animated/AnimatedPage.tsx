/**
 * Animated Page Component
 * 
 * Provides smooth page transitions with fade and slide animations
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedPageProps {
  children: ReactNode;
  direction?: 'forward' | 'backward';
  className?: string;
}

const pageVariants = {
  initial: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? 20 : -20,
    scale: 0.98,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? -20 : 20,
    scale: 0.98,
  }),
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3,
};

export function AnimatedPage({ children, direction = 'forward', className }: AnimatedPageProps) {
  return (
    <motion.div
      custom={direction}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedPageContainer({ children }: { children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      {children}
    </AnimatePresence>
  );
}

