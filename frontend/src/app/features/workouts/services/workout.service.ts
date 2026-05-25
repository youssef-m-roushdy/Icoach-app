import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, PaginatedResponse } from '../../../core/models/api-response.interface';
import { Workout, CreateWorkoutDto, UpdateWorkoutDto } from '../../../core/models/workout.interface';

@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private api = inject(ApiService);

  getWorkouts(params?: Record<string, any>): Observable<ApiResponse<PaginatedResponse<Workout>>> {
    return this.api.get<PaginatedResponse<Workout>>('/v1/workouts', params);
  }

  getWorkoutById(id: number | string): Observable<ApiResponse<Workout>> {
    return this.api.get<Workout>(`/v1/workouts/${id}`);
  }

  createWorkout(dto: CreateWorkoutDto): Observable<any> {
    return this.api.upload<Workout>('/v1/workouts', this.toFormData(dto), 'POST');
  }

  updateWorkout(id: number | string, dto: UpdateWorkoutDto): Observable<any> {
    return this.api.upload<Workout>(`/v1/workouts/${id}`, this.toFormData(dto), 'PUT');
  }

  deleteWorkout(id: number | string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`/v1/workouts/${id}`);
  }

  private toFormData(dto: any): FormData {
    const fd = new FormData();
    Object.entries(dto).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (v instanceof File) {
          fd.append(k, v);
        } else if (Array.isArray(v)) {
          v.forEach(item => fd.append(k, item));
        } else {
          fd.append(k, String(v));
        }
      }
    });
    return fd;
  }
}