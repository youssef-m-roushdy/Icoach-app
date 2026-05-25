import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, PaginatedResponse } from '../../../core/models/api-response.interface';
import { User, UpdateUserDto } from '../../../core/models/user.interface';

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = inject(ApiService);

  getUsers(params?: Record<string, any>): Observable<ApiResponse<PaginatedResponse<User>>> {
    return this.api.get<PaginatedResponse<User>>('/v1/users', params);
  }

  getUserById(id: number | string): Observable<ApiResponse<User>> {
    return this.api.get<User>(`/v1/users/${id}`);
  }

  updateUser(id: number | string, dto: UpdateUserDto): Observable<ApiResponse<User>> {
    return this.api.put<User>(`/v1/users/${id}`, dto);
  }

  deleteUser(id: number | string): Observable<ApiResponse<any>> {
    return this.api.delete<any>(`/v1/users/${id}`);
  }

  getProfile(): Observable<ApiResponse<User>> {
    return this.api.get<User>('/v1/users/profile');
  }

  updateProfile(dto: UpdateUserDto): Observable<ApiResponse<User>> {
    return this.api.put<User>('/v1/users/profile', dto);
  }

  // Admin only methods
  activateUser(id: number | string): Observable<ApiResponse<User>> {
    return this.api.patch<User>(`/v1/users/${id}/activate`, {});
  }

  deactivateUser(id: number | string): Observable<ApiResponse<User>> {
    return this.api.patch<User>(`/v1/users/${id}/deactivate`, {});
  }

  verifyUser(id: number | string): Observable<ApiResponse<User>> {
    return this.api.patch<User>(`/v1/users/${id}/verify`, {});
  }

  changeUserRole(id: number | string, role: string): Observable<ApiResponse<User>> {
    return this.api.patch<User>(`/v1/users/${id}/role`, { role });
  }
}