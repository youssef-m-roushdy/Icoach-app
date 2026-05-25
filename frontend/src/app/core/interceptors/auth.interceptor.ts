import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  const isAuthEndpoint =
    req.url.includes('refresh-token') ||
    req.url.includes('login') ||
    req.url.includes('logout');

  // Always include withCredentials so HTTP-only cookies (refresh token) are sent
  let cloned = req.clone({ withCredentials: true });

  if (token && !isAuthEndpoint) {
    cloned = cloned.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(cloned);
};