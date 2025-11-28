import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Maximize2, Minimize2 } from 'lucide-react';
import { GeminiChat } from './GeminiChat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function GeminiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="group relative h-14 w-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg transition-all hover:shadow-2xl hover:scale-110 dark:from-purple-700 dark:to-blue-700"
            >
              <Sparkles className="h-6 w-6 transition-transform group-hover:rotate-12" />
              
              {/* Pulse effect */}
              <span className="absolute inset-0 rounded-full bg-purple-600 opacity-75 animate-ping" />
            </Button>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs text-background shadow-lg group-hover:block">
              Ask Gemini AI
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop (mobile only) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
            />

            {/* Chat Window */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className={cn(
                'fixed z-50 overflow-hidden rounded-lg border bg-background shadow-2xl',
                // Mobile: Full screen
                'inset-4 md:inset-auto',
                // Desktop: Bottom-right corner
                isMaximized
                  ? 'md:inset-4'
                  : 'md:bottom-6 md:right-6 md:h-[600px] md:w-[400px]',
                // Tablet: Larger
                'sm:h-[700px] sm:w-[500px]'
              )}
            >
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-600/10 to-blue-600/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">AI Assistant</h3>
                      <p className="text-xs text-muted-foreground">Always ready to help</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Maximize/Minimize (desktop only) */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMaximized(!isMaximized)}
                      className="hidden h-8 w-8 p-0 md:flex"
                    >
                      {isMaximized ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {/* Close */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Chat Content */}
                <div className="flex-1 overflow-hidden">
                  <GeminiChat />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
