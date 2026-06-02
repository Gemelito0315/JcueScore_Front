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
    path: 'mesas',
    loadComponent: () => import('./pages/mesas/mesas.page').then(m => m.UsuarioMesasPage),
    canActivate: [authGuard]
  },
  {
    path: 'espectador',
    loadComponent: () => import('./pages/espectador/espectador.page').then(m => m.EspectadorLobbyPage),
    canActivate: [authGuard]
  },
  {
    path: 'espectador-vivo/:id',
    redirectTo: '/mesa/:id'
  },
  {
    path: '**',
    redirectTo: 'pedidos'
  }
];
