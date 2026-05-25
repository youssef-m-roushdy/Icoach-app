// food.interface.ts
export interface Food {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  sugar?: number;
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
}

export type UpdateFoodDto = Partial<CreateFoodDto>;

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface FoodListResponse {
  success: boolean;
  message: string;
  data: Food[];
  pagination: PaginationMeta;
}

export interface FoodResponse {
  success: boolean;
  message: string;
  data: Food;
}