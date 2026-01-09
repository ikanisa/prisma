/**
 * Shared types for gateway schemas
 */

// Paginated result interface - shared across all schemas
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
