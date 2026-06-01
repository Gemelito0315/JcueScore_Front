import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard, userGuard, gariteroGuard } from './core/guards/role.guard';
import { maintenanceGuard } from './core/guards/maintenance.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'mesa/:id',
    loadComponent: () => import('./mesa/mesa').then(m => m.Mesa),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', loadComponent: () => import('./dashboard/inicio/inicio').then(m => m.Inicio) },
      { path: 'partidas', loadComponent: () => import('./dashboard/partidas/partidas').then(m => m.Partidas) },
      { path: 'reportes', loadComponent: () => import('./dashboard/reportes/reportes').then(m => m.Reportes) },
      { path: 'clientes', loadComponent: () => import('./dashboard/clientes/clientes').then(m => m.ClientesAdmin) },
      { path: 'roles',    loadComponent: () => import('./dashboard/roles/roles').then(m => m.Roles) },
      { path: 'modulos',  loadComponent: () => import('./dashboard/modulos/modulos').then(m => m.Modulos) },
      { path: 'caja',     loadComponent: () => import('./dashboard/caja/caja').then(m => m.CajaAdmin) },

      { path: 'torneos', loadComponent: () => import('./dashboard/torneos/torneos').then(m => m.Torneos) },
      { path: 'reservas-admin', loadComponent: () => import('./dashboard/reservas-admin/reservas-admin').then(m => m.ReservasAdmin) },
      { path: 'configuracion', loadComponent: () => import('./dashboard/configuracion/configuracion').then(m => m.Configuracion) },
      { path: 'deudas', loadComponent: () => import('./dashboard/deudas/deudas').then(m => m.Deudas) },
      { path: 'cuentas', loadComponent: () => import('./dashboard/deudas/deudas').then(m => m.Deudas) },
      { path: 'usuarios', loadComponent: () => import('./dashboard/usuarios/usuarios').then(m => m.Usuarios) },
      { path: 'productos', loadComponent: () => import('./dashboard/productos/productos').then(m => m.Productos) },
      { path: 'mesas', loadComponent: () => import('./dashboard/mesas/mesas').then(m => m.Mesas) },
      { path: 'sistema', loadComponent: () => import('./dashboard/sistema/sistema').then(m => m.Sistema) },
      { path: 'espectador', loadComponent: () => import('./usuario/pages/espectador/espectador.page').then(m => m.EspectadorLobbyPage) },
      { path: 'espectador-vivo/:id', loadComponent: () => import('./mesa/mesa').then(m => m.Mesa) },
    ]
  },
  {
    path: 'usuario',
    loadComponent: () => import('./usuario/usuario').then(m => m.Usuario),
    canActivate: [authGuard, userGuard, maintenanceGuard],
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', loadComponent: () => import('./usuario/pages/inicio/inicio').then(m => m.UsuarioInicio) },
      { path: 'reservas', loadComponent: () => import('./usuario/pages/reservas/reservas').then(m => m.UsuarioReservas) },
      { path: 'disponibilidad', loadComponent: () => import('./usuario/pages/disponibilidad/disponibilidad').then(m => m.UsuarioDisponibilidad) },
      { path: 'perfil', loadComponent: () => import('./usuario/pages/perfil/perfil').then(m => m.UsuarioPerfil) },
      { path: 'deudas', loadComponent: () => import('./usuario/pages/deudas/deudas-usuario').then(m => m.DeudasUsuario) },
      { path: 'cuentas', loadComponent: () => import('./usuario/pages/deudas/deudas-usuario').then(m => m.DeudasUsuario) },
      { path: 'productos', loadComponent: () => import('./usuario/pages/productos/productos-usuario.page').then(m => m.ProductosUsuarioPage) },
      { path: 'pedidos', loadComponent: () => import('./usuario/pages/pedidos/pedidos.page').then(m => m.PedidosPage) },
      { path: 'mi-partida', loadComponent: () => import('./usuario/pages/mi-partida/mi-partida.page').then(m => m.MiPartidaPage) },
      { path: 'mesas', loadComponent: () => import('./usuario/pages/mesas/mesas.page').then(m => m.UsuarioMesasPage) },
      { path: 'espectador', loadComponent: () => import('./usuario/pages/espectador/espectador.page').then(m => m.EspectadorLobbyPage) },
      { path: 'espectador-vivo/:id', loadComponent: () => import('./mesa/mesa').then(m => m.Mesa) },
    ]
  },
  {
    path: 'garitero',
    loadComponent: () => import('./garitero/garitero').then(m => m.Garitero),
    canActivate: [authGuard, gariteroGuard],
    children: [
      { path: '', redirectTo: 'turno', pathMatch: 'full' },
      { path: 'turno', loadComponent: () => import('./garitero/pages/turno/turno').then(m => m.Turno) },
      { path: 'caja', loadComponent: () => import('./garitero/pages/caja/caja').then(m => m.Caja) },
      { path: 'transferencias', loadComponent: () => import('./garitero/pages/transferencias/transferencias').then(m => m.Transferencias) },
      { path: 'ventas', loadComponent: () => import('./garitero/pages/ventas/ventas').then(m => m.Ventas) },
      { path: 'deudas', loadComponent: () => import('./garitero/pages/deudas-garitero/deudas-garitero').then(m => m.DeudasGaritero) },
      { path: 'cuentas', loadComponent: () => import('./garitero/pages/deudas-garitero/deudas-garitero').then(m => m.DeudasGaritero) },
      { path: 'inventario', loadComponent: () => import('./garitero/pages/inventario-garitero/inventario-garitero').then(m => m.InventarioGaritero) },
      { path: 'espectador', loadComponent: () => import('./usuario/pages/espectador/espectador.page').then(m => m.EspectadorLobbyPage) },
      { path: 'espectador-vivo/:id', loadComponent: () => import('./mesa/mesa').then(m => m.Mesa) },
    ]
  },
  {
    path: 'tablet',
    loadChildren: () => import('./tablet/tablet.routes').then(m => m.TABLET_ROUTES)
  },
  {
    path: 'mantenimiento',
    loadComponent: () => import('./mantenimiento/mantenimiento').then(m => m.Mantenimiento),
  },
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  }
];
