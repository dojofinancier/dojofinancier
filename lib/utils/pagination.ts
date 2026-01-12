/**
 * Pagination utilities for infinite scrolling
 */

export type PaginationParams = {
  cursor?: string;
  limit?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Default page size for infinite scrolling
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Parse pagination parameters from request
 */
export function parsePaginationParams(
  params: PaginationParams
): { cursor: string | undefined; limit: number } {
  return {
    cursor: params.cursor,
    limit: params.limit || DEFAULT_PAGE_SIZE,
  };
}

