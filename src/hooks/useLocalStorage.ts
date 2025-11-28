import { useState, useEffect, useCallback } from 'react';

interface UseLocalStorageOptions<T> {
  defaultValue: T;
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
}

export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T>
) {
  const { defaultValue, serializer, deserializer } = options;

  const serialize = serializer || JSON.stringify;
  const deserialize = deserializer || JSON.parse;

  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback(
    (newValue: T | ((val: T) => T)) => {
      try {
        const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
        setValue(valueToStore);
        window.localStorage.setItem(key, serialize(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, value, serialize]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setValue(defaultValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  return [value, setStoredValue, removeValue] as const;
}

// Theme preference hook
export function useThemePreference() {
  return useLocalStorage<'light' | 'dark' | 'system'>('theme-preference', {
    defaultValue: 'system',
  });
}

// Recent searches hook
export function useRecentSearches(maxItems = 5) {
  const [searches, setSearches, clearSearches] = useLocalStorage<string[]>(
    'recent-searches',
    { defaultValue: [] }
  );

  const addSearch = useCallback(
    (search: string) => {
      const updated = [search, ...searches.filter(s => s !== search)].slice(0, maxItems);
      setSearches(updated);
    },
    [searches, setSearches, maxItems]
  );

  return { searches, addSearch, clearSearches };
}
