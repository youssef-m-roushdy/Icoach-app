import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse, PaginatedResponse } from '../../../core/models/api-response.interface';
import { User, UpdateUserDto } from '../../../core/models/user.interface';

export interface CreateUserByAdminDto {
  email: string;
  username: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: 'user' | 'admin' | 'moderator' | 'trainer';
}

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

  deactivateUser(id: number | string): Observable<ApiResponse<any>> {
    return this.api.patch<any>(`/v1/users/${id}/deactivate`, null);
  }

  activateUser(id: number | string): Observable<ApiResponse<any>> {
    return this.api.patch<any>(`/v1/users/${id}/activate`, null);
  }

  getProfile(): Observable<ApiResponse<User>> {
    return this.api.get<User>('/v1/users/profile');
  }
  
  createUserByAdmin(dto: CreateUserByAdminDto): Observable<ApiResponse<{ user: User }>> {
    return this.api.post<{ user: User }>('/v1/users/admin/create', dto);
  }
}