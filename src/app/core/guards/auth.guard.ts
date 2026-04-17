import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../auth/services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  const token = localStorage.getItem('token');
  if (token) return true;

  router.navigate(['/auth/login']);
  return false;
};
