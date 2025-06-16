
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PhoneSuggestion {
  number: string;
  confidence: number;
}

export const useAIPhoneSuggestions = () => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = useCallback(async (input: string, sessionId: string) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('ai-phone-suggestions', {
        body: { 
          input: input.trim(),
          sessionId 
        }
      });

      if (funcError) {
        throw funcError;
      }

      setSuggestions(data?.suggestions || []);
    } catch (err) {
      console.error('Error getting AI phone suggestions:', err);
      setError('Failed to get suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    getSuggestions,
    clearSuggestions
  };
};
