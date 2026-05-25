import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.interface';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl: string = environment.apiUrl;

  get<T>(endpoint: string, params?: Record<string, any>): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') {
          httpParams = httpParams.set(k, String(v));
        }
      });
    }
    return this.http.get<ApiResponse<T>>(this.url(endpoint), { params: httpParams, withCredentials: true });
  }

  post<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.url(endpoint), body, { withCredentials: true });
  }

  put<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(this.url(endpoint), body, { withCredentials: true });
  }

  patch<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(this.url(endpoint), body, { withCredentials: true });
  }

  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(this.url(endpoint), { withCredentials: true });
  }

  upload<T>(endpoint: string, formData: FormData, method: 'POST' | 'PUT' = 'POST'): Observable<HttpEvent<ApiResponse<T>>> {
    const req = new HttpRequest<FormData>(method, this.url(endpoint), formData, {
      withCredentials: true,
      reportProgress: true,
    });
    return this.http.request<ApiResponse<T>>(req);
  }

  private url(endpoint: string): string {
    const base = this.baseUrl.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  formatError(error: any): string {
    if (!error) return 'Operation failed';
    let errorMessage = error.error?.message || error.message || 'Operation failed';
    if (error.error?.errors && Array.isArray(error.error.errors)) {
      errorMessage = error.error.errors.map((d: any) => `${d.field}: ${d.message}`).join(', ');
    } else if (error.error?.error?.details) {
      errorMessage = error.error.error.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
    }
    return errorMessage;
  }
}
