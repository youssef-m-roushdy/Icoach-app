import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notif = inject(NotificationService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const msg = err.error?.message || err.message || 'An unexpected error occurred';
      if (err.status !== 401) notif.error(msg);
      return throwError(() => err);
    })
  );
};