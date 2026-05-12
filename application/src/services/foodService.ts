import { apiCallWithRefresh, createJsonHeaders, request } from './api';

// ============================================================================
// Core Types
// ============================================================================

export interface Food {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  sugar: number;
  pic: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Response Types
// ============================================================================

export interface FoodsResponse {
  success: boolean;
  message: string;
  data: Food[];
  pagination: PaginationData;
}

export interface GetFoodsParams {
  page?: number;
  limit?: number;
  search?: string;
  minCalories?: number;
  maxCalories?: number;
  minProtein?: number;
}

// ============================================================================
// Service
// ============================================================================

export const foodService = {
  /**
   * Get a paginated list of all foods with optional filters.
   * Authentication required.
   */
  async getFoods(
    token: string,
    params?: GetFoodsParams
  ): Promise<FoodsResponse> {
    return apiCallWithRefresh(
      async (accessToken) =>
        request<FoodsResponse>(
          '/v1/foods',
          {
            method: 'GET',
            headers: createJsonHeaders(accessToken),
          },
          params as Record<string, any> // Casting to handle numeric types in query params if the base request function expects strings
        ),
      token
    );
  },
};