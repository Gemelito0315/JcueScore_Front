import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';

export const USUARIO_ROUTES: Routes = [
  {
    path: 'pedidos',
    loadComponent: () => import('./pages/pedidos/pedidos.page').then(m => m.PedidosPage),
    canActivate: [authGuard]
  },
  {
    path: 'productos',
    loadComponent: () => import('./pages/productos/productos-usuario.page').then(m => m.ProductosUsuarioPage),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'pedidos'
  }
];
