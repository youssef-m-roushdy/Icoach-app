import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';
import { ApiResponse } from '../models/api-response.interface';
import { LoginDto, LoginResponse } from '../models/auth.interfaces';

const TOKEN_KEY = 'icoach_access_token';
const USER_KEY = 'icoach_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private storage = inject(StorageService);
  private router = inject(Router);

  private _currentUser = signal<LoginResponse['user'] | null>(this.storage.getItem(USER_KEY));
  private _accessToken = signal<string | null>(this.storage.getItem(TOKEN_KEY));

  currentUser = this._currentUser.asReadonly();
  isAuthenticated = computed(() => !!this._accessToken());
  isAdmin = computed(() => this._currentUser()?.role === 'admin');

  login(dto: LoginDto): Observable<ApiResponse<LoginResponse>> {
    return this.api.post<LoginResponse>('/v1/users/login', dto).pipe(
      tap(res => {
        if (res.success && res.data) {
          this._accessToken.set(res.data.accessToken);
          this._currentUser.set(res.data.user);
          this.storage.setItem(TOKEN_KEY, res.data.accessToken);
          this.storage.setItem(USER_KEY, res.data.user);
        }
      })
    );
  }

  logout(): Observable<ApiResponse<any>> {
    return this.api.post<any>('/v1/users/logout', {}).pipe(
      tap(() => this.clearSession())
    );
  }

  refreshToken(): Observable<ApiResponse<{ accessToken: string }>> {
    return this.api.post<{ accessToken: string }>('/v1/users/refresh-token', {}).pipe(
      tap(res => {
        if (res.success && res.data?.accessToken) {
          this._accessToken.set(res.data.accessToken);
          this.storage.setItem(TOKEN_KEY, res.data.accessToken);
        }
      })
    );
  }

  getAccessToken(): string | null {
    return this._accessToken();
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    this.storage.removeItem(TOKEN_KEY);
    this.storage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }
}
