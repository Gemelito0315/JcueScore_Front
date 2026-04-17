import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const router = inject(Router);

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      if ((err.status === 401 || err.status === 403) && !req.url.includes('/auth/')) {
        localStorage.removeItem('token');
        localStorage.removeItem('authUser');
        router.navigate(['/auth/login']);
      }
      return throwError(() => err);
    })
  );
};
