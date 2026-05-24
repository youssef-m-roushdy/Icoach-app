import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, PaginatedResponse } from '../../../core/models/api-response.interface';
import { Food, CreateFoodDto, UpdateFoodDto } from '../../../core/models/food.interface';

@Injectable({ providedIn: 'root' })
export class FoodService {
  private api = inject(ApiService);

  getFoods(params?: Record<string, any>): Observable<ApiResponse<PaginatedResponse<Food>>> {
    return this.api.get<PaginatedResponse<Food>>('/v1/foods', params);
  }

  searchFoods(query: string): Observable<ApiResponse<Food[]>> {
    return this.api.get<Food[]>('/v1/foods/search', { q: query });
  }

  getFoodById(id: string): Observable<ApiResponse<Food>> {
    return this.api.get<Food>(`/v1/foods/${id}`);
  }

  createFood(dto: CreateFoodDto): Observable<any> {
    const fd = this.toFormData(dto);
    return this.api.upload<Food>('/v1/foods', fd, 'POST');
  }

  updateFood(id: string, dto: UpdateFoodDto): Observable<any> {
    const fd = this.toFormData(dto);
    return this.api.upload<Food>(`/v1/foods/${id}`, fd, 'PUT');
  }

  deleteFood(id: string): Observable<ApiResponse<any>> {
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
