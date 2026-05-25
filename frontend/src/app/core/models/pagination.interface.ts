export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'number' | 'date' | 'badge' | 'image' | 'actions' | 'status';
  formatter?: (value: any, row: T) => string;
  badgeClass?: (value: any) => string;
  width?: string;
  icon?: string;
  truncate?: boolean;
}