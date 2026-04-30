import type { PaginationParams, PaginatedResult } from '../types/pagination.js';
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '../types/pagination.js';

export function normalizePagination(params: Partial<PaginationParams>): PaginationParams {
  return {
    cursor: params.cursor,
    limit: Math.min(params.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    sortBy: params.sortBy ?? 'createdAt',
    sortOrder: params.sortOrder ?? 'desc',
  };
}

/** Encode a cursor from a record's ID and timestamp */
export function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64url');
}

/** Decode a cursor back to an ID */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

/** Build a paginated result from raw DB items (assumes items.length === limit + 1 trick) */
export function buildPaginatedResult<T extends { id: string }>(
  items: T[],
  limit: number,
  totalCount: number,
): PaginatedResult<T> {
  const hasNextPage = items.length > limit;
  const resultItems = hasNextPage ? items.slice(0, limit) : items;
  const lastItem = resultItems[resultItems.length - 1];
  const nextCursor = hasNextPage && lastItem ? encodeCursor(lastItem.id) : null;

  return {
    items: resultItems,
    nextCursor,
    totalCount,
  };
}
