import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'productos',
    loadComponent: () => import('./pages/productos-admin/productos-admin.page').then(m => m.ProductosAdminPage),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'productos'
  }
];
