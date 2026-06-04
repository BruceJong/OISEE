export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
  details?: unknown;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
