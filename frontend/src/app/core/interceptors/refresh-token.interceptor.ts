import { HttpInterceptorFn, HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('refresh-token') && !req.url.includes('login')) {
        return handle401(req, next, auth);
      }
      return throwError(() => err);
    })
  );
};

function handle401(req: HttpRequest<unknown>, next: HttpHandlerFn, auth: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);
    return auth.refreshToken().pipe(
      switchMap(res => {
        isRefreshing = false;
        refreshSubject.next(res.data.accessToken);
        const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${res.data.accessToken}` } });
        return next(cloned);
      }),
      catchError(err => {
        isRefreshing = false;
        auth.clearSession();
        return throwError(() => err);
      })
    );
  }
  return refreshSubject.pipe(
    filter(t => t !== null),
    take(1),
    switchMap(token => {
      const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      return next(cloned);
    })
  );
}
