import { useState, useCallback, useMemo } from 'react';
import type { AdminFilters, SortOrder } from '@/types/admin';

interface UseAdminFiltersOptions<T extends AdminFilters> {
  initialFilters?: Partial<T>;
  onFiltersChange?: (filters: T) => void;
}

interface UseAdminFiltersReturn<T extends AdminFilters> {
  filters: T;
  updateFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  updateFilters: (updates: Partial<T>) => void;
  resetFilters: () => void;
  setSort: (field: string, order?: SortOrder) => void;
  clearSearch: () => void;
  hasActiveFilters: boolean;
}

export function useAdminFilters<T extends AdminFilters>(
  defaultFilters: T,
  options: UseAdminFiltersOptions<T> = {}
): UseAdminFiltersReturn<T> {
  const { initialFilters = {}, onFiltersChange } = options;

  const [filters, setFilters] = useState<T>({
    ...defaultFilters,
    ...initialFilters
  });

  const updateFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [filters, onFiltersChange]);

  const updateFilters = useCallback((updates: Partial<T>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [filters, onFiltersChange]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    onFiltersChange?.(defaultFilters);
  }, [defaultFilters, onFiltersChange]);

  const setSort = useCallback((field: string, order: SortOrder = 'desc') => {
    updateFilters({
      sortBy: field,
      sortOrder: order,
      page: 1 // Reset to first page when sorting
    } as Partial<T>);
  }, [updateFilters]);

  const clearSearch = useCallback(() => {
    updateFilter('search' as keyof T, '' as T[keyof T]);
  }, [updateFilter]);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      const value = filters[key as keyof T];
      const defaultValue = defaultFilters[key as keyof T];
      
      if (key === 'search') return value && String(value).trim() !== '';
      if (key === 'page' || key === 'limit') return false; // Don't consider pagination as filter
      
      return value !== defaultValue;
    });
  }, [filters, defaultFilters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    setSort,
    clearSearch,
    hasActiveFilters
  };
}