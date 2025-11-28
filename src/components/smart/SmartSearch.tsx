import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, X, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { geminiService } from '@/services/gemini';

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  type: 'document' | 'task' | 'engagement' | 'client';
  url: string;
  relevance: number;
}

interface SmartSearchProps {
  placeholder?: string;
  className?: string;
  onResultSelect?: (result: SearchResult) => void;
}

export function SmartSearch({ 
  placeholder = 'Search with AI...', 
  className,
  onResultSelect 
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setShowResults(true);

      try {
        // Use Gemini semantic search if available
        if (geminiService.isAvailable()) {
          const searchResults = await geminiService.semanticSearch(query);
          setResults(searchResults);
        } else {
          // Fallback to mock results
          setResults([
            {
              id: '1',
              title: 'Q4 Financial Report',
              snippet: 'Quarterly revenue increased by 23% to $1.2M...',
              type: 'document',
              url: '/documents/1',
              relevance: 0.95,
            },
          ]);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    // Save to recent searches
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent-searches', JSON.stringify(updated));

    setShowResults(false);
    setQuery('');
    
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  const handleRecentSearch = (search: string) => {
    setQuery(search);
    setShowResults(true);
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const typeColors = {
    document: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    task: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    engagement: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    client: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  };

  return (
    <div ref={searchRef} className={cn('relative w-full max-w-2xl', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="pl-10 pr-20 h-12 text-base"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {geminiService.isAvailable() && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3" />
              <span className="text-xs font-medium">AI</span>
            </div>
          )}
          
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearQuery}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showResults && (query.length >= 2 || recentSearches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg overflow-hidden z-50"
          >
            {/* Loading State */}
            {isSearching && (
              <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm">Searching...</span>
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Recent Searches
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearch(search)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-md text-left"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{search}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {!isSearching && results.length > 0 && (
              <div className="max-h-[400px] overflow-y-auto">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full p-3 hover:bg-muted transition-colors text-left border-b last:border-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {result.title}
                          </span>
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                            typeColors[result.type]
                          )}>
                            {result.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {result.snippet}
                        </p>
                      </div>
                      
                      {/* Relevance Score */}
                      {result.relevance > 0.8 && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Sparkles className="h-3 w-3" />
                          <span className="font-medium">
                            {Math.round(result.relevance * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {!isSearching && query.length >= 2 && results.length === 0 && (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No results found for "{query}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try different keywords or check spelling
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
