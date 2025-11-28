/**
 * Smart Input - AI-powered autocomplete & suggestions
 * Phase 4-5: Intelligent form inputs
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  onAISuggest?: (input: string) => Promise<string[]>;
  className?: string;
  disabled?: boolean;
}

export function SmartInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
  onAISuggest,
  className,
  disabled,
}: SmartInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch AI suggestions when user types
  useEffect(() => {
    if (!onAISuggest || value.length < 3) {
      setAiSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const newSuggestions = await onAISuggest(value);
        setAiSuggestions(newSuggestions);
      } catch (error) {
        console.error('AI suggestion error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, onAISuggest]);

  const allSuggestions = [...suggestions, ...aiSuggestions].filter((s) =>
    s.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className={cn(
            'pr-10',
            aiSuggestions.length > 0 && 'border-primary/50',
            className
          )}
          disabled={disabled}
        />
        {aiSuggestions.length > 0 && (
          <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-pulse" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && allSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'absolute z-50 w-full mt-1',
              'rounded-md border bg-popover shadow-lg',
              'max-h-60 overflow-y-auto'
            )}
          >
            {allSuggestions.map((suggestion, idx) => {
              const isAI = aiSuggestions.includes(suggestion);
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onChange(suggestion);
                    setShowSuggestions(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    'flex items-center justify-between gap-2',
                    'transition-colors'
                  )}
                >
                  <span>{suggestion}</span>
                  {isAI && (
                    <Sparkles className="h-3 w-3 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
