import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notif = inject(NotificationService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let msg = err.error?.message || err.message || 'An unexpected error occurred';
      
      // Global handling for express-validator array layouts and detailed backend errors
      if (err.error?.errors && Array.isArray(err.error.errors)) {
        msg = err.error.errors.map((d: any) => `${d.field}: ${d.message}`).join(', ');
      } else if (err.error?.error?.details) {
        msg = err.error.error.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
      }

      if (err.status !== 401) notif.error(msg);
      return throwError(() => err);
    })
  );
};