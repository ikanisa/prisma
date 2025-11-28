/**
 * Performance Monitor
 * Development tool to track render performance
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceStats {
  fps: number;
  memory?: number;
  renderCount: number;
}

export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    renderCount: 0,
  });

  useEffect(() => {
    if (!isVisible) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const updateStats = () => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        const memory = (performance as any).memory?.usedJSHeapSize 
          ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
          : undefined;

        setStats(prev => ({
          fps,
          memory,
          renderCount: prev.renderCount + 1,
        }));

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(updateStats);
    };

    animationFrameId = requestAnimationFrame(updateStats);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isVisible]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-20 right-4 z-50 p-2 rounded-lg bg-card border border-border shadow-lg hover:bg-accent transition-colors"
        title="Performance Monitor"
      >
        <Activity className="w-5 h-5" />
      </button>

      {/* Stats panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-32 right-4 z-50 p-4 rounded-lg bg-card border border-border shadow-lg min-w-[200px]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Performance</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-accent rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">FPS:</span>
                <span
                  className={cn(
                    'font-mono',
                    stats.fps >= 50 ? 'text-green-500' :
                    stats.fps >= 30 ? 'text-yellow-500' :
                    'text-red-500'
                  )}
                >
                  {stats.fps}
                </span>
              </div>

              {stats.memory !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory:</span>
                  <span className="font-mono">{stats.memory} MB</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Renders:</span>
                <span className="font-mono">{stats.renderCount}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
