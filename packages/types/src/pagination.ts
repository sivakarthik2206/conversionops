export interface PaginatedQuery {
  cursor?: string;
  limit?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}
