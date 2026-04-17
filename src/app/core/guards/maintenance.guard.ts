import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Auth } from '../../auth/services/auth';

export const maintenanceGuard: CanActivateFn = () => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const auth = inject(Auth);

  // Admin siempre puede entrar
  const user = auth.currentUser();
  if (user?.roles?.some(r => r.id === 1)) return true;

  return http.get<any>('http://localhost:3000/maintenance').pipe(
    map(data => {
      if (data.active) {
        router.navigate(['/mantenimiento']);
        return false;
      }
      return true;
    }),
    catchError(() => of(true))
  );
};
