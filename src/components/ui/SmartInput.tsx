import { useState, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  aiSuggestions?: string[];
  onAcceptSuggestion?: (suggestion: string) => void;
  error?: string;
}

export const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
  ({ label, aiSuggestions = [], onAcceptSuggestion, error, className, ...props }, ref) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (aiSuggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    }, [aiSuggestions]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!showSuggestions || aiSuggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % aiSuggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + aiSuggestions.length) % aiSuggestions.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (onAcceptSuggestion) {
            onAcceptSuggestion(aiSuggestions[selectedIndex]);
            setShowSuggestions(false);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    };

    return (
      <div ref={containerRef} className="relative w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus-visible:ring-red-500',
              aiSuggestions.length > 0 && 'pr-10',
              className
            )}
            onKeyDown={handleKeyDown}
            {...props}
          />
          
          {aiSuggestions.length > 0 && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-purple-500 hover:text-purple-600"
              onClick={() => setShowSuggestions(!showSuggestions)}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}

        <AnimatePresence>
          {showSuggestions && aiSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 w-full rounded-lg border bg-popover p-2 shadow-lg"
            >
              <div className="mb-2 flex items-center justify-between px-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  AI Suggestions
                </div>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="rounded p-1 hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              
              <div className="space-y-1">
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (onAcceptSuggestion) {
                        onAcceptSuggestion(suggestion);
                        setShowSuggestions(false);
                      }
                    }}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      index === selectedIndex && 'bg-accent text-accent-foreground'
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              
              <div className="mt-2 border-t pt-2 px-2 text-xs text-muted-foreground">
                Press ↑↓ to navigate, Enter to select, Esc to close
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SmartInput.displayName = 'SmartInput';
