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
  type?: 'text' | 'number' | 'date' | 'image' | 'badge' | 'status' | 'actions' | 'custom';
  formatter?: (value: any, row: T) => string;
  badgeClass?: (value: any) => string;
  width?: string;
  icon?: string;
  truncate?: boolean;
}