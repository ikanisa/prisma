/**
 * Streaming Text Component
 * 
 * Displays text with streaming animation for real-time updates
 */

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface StreamingTextProps {
  text: string;
  className?: string;
  speed?: number; // Characters per second
  onComplete?: () => void;
  streaming?: boolean;
}

export function StreamingText({ 
  text, 
  className, 
  speed = 30,
  onComplete,
  streaming = false 
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!streaming) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    if (displayedText.length < text.length) {
      const timeout = setTimeout(() => {
        const nextChar = text[displayedText.length];
        setDisplayedText(prev => prev + nextChar);
        
        if (displayedText.length + 1 === text.length) {
          setIsComplete(true);
          onComplete?.();
        }
      }, 1000 / speed);

      return () => clearTimeout(timeout);
    }
  }, [text, displayedText, speed, streaming, onComplete]);

  return (
    <motion.span
      className={cn('inline-block', className)}
      animate={streaming && !isComplete ? {
        opacity: [0.5, 1, 0.5],
      } : {}}
      transition={{
        duration: 1.5,
        repeat: streaming && !isComplete ? Infinity : 0,
        ease: 'easeInOut',
      }}
    >
      {displayedText}
      {streaming && !isComplete && (
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-current ml-1"
        />
      )}
    </motion.span>
  );
}

interface StreamingMarkdownProps {
  content: string;
  className?: string;
  streaming?: boolean;
}

export function StreamingMarkdown({ content, className, streaming = false }: StreamingMarkdownProps) {
  return (
    <motion.div
      className={cn('prose prose-sm max-w-none dark:prose-invert', className)}
      animate={streaming ? {
        opacity: [0.7, 1, 0.7],
      } : {}}
      transition={{
        duration: 1.5,
        repeat: streaming ? Infinity : 0,
        ease: 'easeInOut',
      }}
    >
      <StreamingText text={content} streaming={streaming} />
    </motion.div>
  );
}

