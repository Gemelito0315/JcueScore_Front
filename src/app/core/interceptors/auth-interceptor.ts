import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from '../../auth/services/auth';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const router = inject(Router);
  const auth = inject(Auth);

  // Reescribir dinámicamente la URL si apunta al localhost estático, usando la configuración del entorno
  let targetUrl = req.url;
  if (targetUrl.startsWith('http://localhost:3000')) {
    targetUrl = targetUrl.replace('http://localhost:3000', environment.apiBaseUrl);
  } else if (targetUrl.startsWith('/')) {
    targetUrl = `${environment.apiBaseUrl}${targetUrl}`;
  }

  // Clonar la petición y añadir el token solo si existe, aplicando la URL reescrita
  let authReq = req.clone({
    url: targetUrl,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {}
  });

  return next(authReq).pipe(
    catchError(err => {
      // Manejo de errores 401 (No autorizado)
      if (err.status === 401 && !req.url.includes('/auth/')) {
        auth.logout();
        router.navigate(['/auth/login']);
      } 
      
      // Manejo silencioso del 403 (Forbidden)
      // Ya no usamos console.warn para mantener la consola limpia
      if (err.status === 403) {
        // Aquí podrías redirigir a una página de "Sin Permisos" si fuera necesario
        // router.navigate(['/forbidden']);
      }

      return throwError(() => err);
    })
  );
};