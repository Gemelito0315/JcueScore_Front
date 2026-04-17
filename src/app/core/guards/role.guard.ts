import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../auth/services/auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const user = auth.currentUser();

  if (user?.roles?.some(r => r.id === 1)) return true;

  // Si es garitero va a su panel
  if (user?.roles?.some(r => r.id === 3)) { router.navigate(['/garitero']); return false; }

  router.navigate(['/usuario']);
  return false;
};

export const userGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user) { router.navigate(['/auth/login']); return false; }
  if (user.roles?.some(r => r.id === 1)) { router.navigate(['/dashboard']); return false; }
  if (user.roles?.some(r => r.id === 3)) { router.navigate(['/garitero']); return false; }

  return true;
};

export const gariteroGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user) { router.navigate(['/auth/login']); return false; }
  if (user.roles?.some(r => r.id === 1)) { router.navigate(['/dashboard']); return false; }
  if (user.roles?.some(r => r.id === 3)) return true;

  router.navigate(['/usuario']);
  return false;
};
