import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check } from 'lucide-react';
import { useLocalAI } from '@/hooks/useLocalAI';
import { cn } from '@/lib/utils';
import { debounce } from '@/lib/utils';

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  aiSuggestions?: boolean;
  className?: string;
  onAcceptSuggestion?: (suggestion: string) => void;
}

export function SmartInput({
  value,
  onChange,
  placeholder = 'Type something...',
  aiSuggestions = true,
  className,
  onAcceptSuggestion,
}: SmartInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { loading, suggest } = useLocalAI();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced AI suggestion fetcher
  const fetchSuggestions = useRef(
    debounce(async (text: string) => {
      if (!text || text.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      await suggest(text, 'completion');
      // Mock suggestions for demo
      setSuggestions([
        `${text} - AI suggestion 1`,
        `${text} - AI suggestion 2`,
        `${text} - AI suggestion 3`,
      ]);
      setShowSuggestions(true);
    }, 500)
  ).current;

  useEffect(() => {
    if (aiSuggestions && value) {
      fetchSuggestions(value);
    }
  }, [value, aiSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (showSuggestions) {
        e.preventDefault();
        acceptSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const acceptSuggestion = (suggestion: string) => {
    onChange(suggestion);
    onAcceptSuggestion?.(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-2 pr-10 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all',
            className
          )}
        />

        {/* AI Indicator */}
        {aiSuggestions && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading ? (
              <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
            ) : (
              showSuggestions && (
                <Sparkles className="h-4 w-4 text-purple-500" />
              )
            )}
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-10 w-full mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                <Sparkles className="h-3 w-3" />
                <span className="font-medium">AI Suggestions</span>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => acceptSuggestion(suggestion)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between group',
                    index === selectedIndex
                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                  )}
                >
                  <span className="flex-1 truncate">{suggestion}</span>
                  {index === selectedIndex && (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700">
                Tab
              </kbd>{' '}
              to accept • <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700">
                Esc
              </kbd>{' '}
              to dismiss
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
