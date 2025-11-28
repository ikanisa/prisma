/**
 * Lazy Image Component
 * Progressive loading with blur placeholder
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  aspectRatio?: '1/1' | '16/9' | '4/3' | '3/2';
  className?: string;
  onLoad?: () => void;
}

export function LazyImage({
  src,
  alt,
  aspectRatio = '16/9',
  className,
  onLoad,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted rounded-lg',
        className
      )}
      style={{ aspectRatio }}
    >
      {isInView && (
        <>
          {/* Blur placeholder */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}

          {/* Actual image */}
          <motion.img
            ref={imgRef}
            src={src}
            alt={alt}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={isLoaded ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.3 }}
            className="w-full h-full object-cover"
            onLoad={() => {
              setIsLoaded(true);
              onLoad?.();
            }}
          />
        </>
      )}
    </div>
  );
}
