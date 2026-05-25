import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api-response.interface';
import { Food, CreateFoodDto, UpdateFoodDto } from '../../../core/models/food.interface';

// Define the actual API response structure from your backend
export interface FoodListResponse {
  success: boolean;
  message: string;
  data: Food[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class FoodService {
  private api = inject(ApiService);

  getFoods(params?: Record<string, any>): Observable<ApiResponse<FoodListResponse>> {
    return this.api.get<FoodListResponse>('/v1/foods', params);
  }

  searchFoods(query: string): Observable<ApiResponse<Food[]>> {
    return this.api.get<Food[]>('/v1/foods/search', { query });
  }

  getFoodById(id: number | string): Observable<ApiResponse<Food>> {
    return this.api.get<Food>(`/v1/foods/${id}`);
  }

  createFood(payload: CreateFoodDto | FormData): Observable<any> {
    const fd = payload instanceof FormData ? payload : this.toFormData(payload);
    return this.api.upload<Food>('/v1/foods', fd, 'POST');
  }

  updateFood(id: number | string, payload: UpdateFoodDto | FormData): Observable<any> {
    const fd = payload instanceof FormData ? payload : this.toFormData(payload);
    return this.api.upload<Food>(`/v1/foods/${id}`, fd, 'PUT');
  }

  deleteFood(id: number | string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`/v1/foods/${id}`);
  }

  private toFormData(dto: any): FormData {
    const fd = new FormData();
    Object.entries(dto).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (v instanceof File) fd.append(k, v);
        else fd.append(k, String(v));
      }
    });
    return fd;
  }
}