export interface Food {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  sugar?: number;
  category?: string;
  pic?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoodDto {
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  sugar?: number;
  category?: string;
  pic?: File;
}

export type UpdateFoodDto = Partial<CreateFoodDto>;

// ✅ Matches your API pagination object
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ✅ Matches your API response: { success, message, data: [...], pagination: {} }
export interface FoodListResponse {
  success: boolean;
  message: string;
  data: Food[];
  pagination: PaginationMeta;
}

// ✅ Single food response: { success, message, data: { ...food } }
export interface FoodResponse {
  success: boolean;
  message: string;
  data: Food;
}