import { HttpInterceptorFn, HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { ReplaySubject, catchError, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

let isRefreshing = false;
let refreshSubject = new ReplaySubject<string>(1);

export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('refresh-token') || req.url.includes('login');
      const shouldRefresh = err.status === 401 || err.status === 403;
      if (shouldRefresh && !isAuthEndpoint) {
        return handle401(req, next, auth);
      }
      return throwError(() => err);
    })
  );
};

function handle401(req: HttpRequest<unknown>, next: HttpHandlerFn, auth: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject = new ReplaySubject<string>(1);
    return auth.refreshToken().pipe(
      switchMap(res => {
        const token = res.data?.accessToken;
        if (!token) {
          isRefreshing = false;
          auth.clearSession();
          return throwError(() => new Error('Missing access token from refresh response'));
        }
        isRefreshing = false;
        refreshSubject.next(token);
        refreshSubject.complete();
        const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        return next(cloned);
      }),
      catchError(err => {
        isRefreshing = false;
        refreshSubject.error(err);
        auth.clearSession();
        return throwError(() => err);
      })
    );
  }
  return refreshSubject.pipe(
    take(1),
    switchMap(token => {
      const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      return next(cloned);
    })
  );
}
