import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { ReplaySubject, catchError, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

let isRefreshing = false;
let refreshSubject = new ReplaySubject<string>(1);

export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthEndpoint =
        req.url.includes('refresh-token') ||
        req.url.includes('login') ||
        req.url.includes('logout');

      // Only intercept 401 (expired token).
      // Do NOT intercept 403 — that's a permissions error, not an expired token,
      // and would cause an infinite refresh loop.
      if (err.status === 401 && !isAuthEndpoint) {
        return handle401(req, next, auth);
      }

      return throwError(() => err);
    })
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject = new ReplaySubject<string>(1);

    return auth.refreshToken().pipe(
      switchMap((res) => {
        const token = res.data?.accessToken;

        if (!token) {
          isRefreshing = false;
          auth.clearSession();
          return throwError(() => new Error('No access token in refresh response'));
        }

        isRefreshing = false;
        refreshSubject.next(token);
        refreshSubject.complete();

        // Retry the original failed request with the new token
        const retried = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        return next(retried);
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshSubject.error(err);
        auth.clearSession();
        return throwError(() => err);
      })
    );
  }

  // While a refresh is already in-flight, queue all concurrent 401 requests
  // and retry them once the new token arrives
  return refreshSubject.pipe(
    take(1),
    switchMap((token) => {
      const retried = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      return next(retried);
    })
  );
}