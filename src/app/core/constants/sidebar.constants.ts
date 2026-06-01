import { SidebarItem } from '../interfaces/sidebar.interface';

export const ADMIN_MENU: SidebarItem[] = [
  {
    label: 'Inicio',
    route: '/dashboard/inicio',
    svgPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'
  },
  {
    label: 'Partidas en curso',
    route: '/dashboard/partidas',
    svgPath: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>'
  },
  {
    label: 'Reportes',
    route: '/dashboard/reportes',
    svgPath: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'
  },
  {
    label: 'Usuarios',
    route: '/dashboard/usuarios',
    svgPath: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  },
  {
    label: 'Clientes',
    route: '/dashboard/clientes',
    svgPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  },

  {
    label: 'Deudas (Historial)',
    route: '/dashboard/deudas',
    svgPath: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'
  },
  {
    label: 'Reservas',
    route: '/dashboard/reservas-admin',
    svgPath: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
  },
  {
    label: 'Productos',
    route: '/dashboard/productos',
    svgPath: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'
  },
  {
    label: 'Mesas',
    route: '/dashboard/mesas',
    svgPath: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>'
  },
  {
    label: '🔴 Espectador (TV)',
    route: '/dashboard/espectador',
    svgPath: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'
  },
  {
    label: 'Caja y Salidas',
    route: '/dashboard/caja',
    svgPath: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'
  },
  {
    label: 'Roles y Permisos',
    route: '/dashboard/roles',
    svgPath: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
  },

  {
    label: 'Configuración',
    route: '/dashboard/configuracion',
    svgPath: '<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>'
  },
  {
    label: 'Sistema',
    route: '/dashboard/sistema',
    svgPath: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
  }
];

export const GARITERO_MENU: SidebarItem[] = [
  {
    label: 'Mi Turno',
    route: '/garitero/turno',
    svgPath: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  },
  {
    label: '🔴 Espectador (TV)',
    route: '/garitero/espectador',
    svgPath: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'
  },
  {
    label: 'Gastos y Salidas',
    route: '/garitero/caja',
    svgPath: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'
  },
  {
    label: 'Punto de Venta',
    route: '/garitero/ventas',
    svgPath: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>'
  },
  {
    label: 'Transferencias',
    route: '/garitero/transferencias',
    svgPath: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'
  },
  {
    label: 'Cuentas (Hoy)',
    route: '/garitero/cuentas',
    svgPath: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
  },
  {
    label: 'Deudas (Historial)',
    route: '/garitero/deudas',
    svgPath: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'
  },
  {
    label: 'Inventario',
    route: '/garitero/inventario',
    svgPath: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'
  }
];

export const USUARIO_MENU: SidebarItem[] = [
  {
    label: 'Inicio',
    route: '/usuario/inicio',
    svgPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'
  },
  {
    label: 'Partida en Vivo',
    route: '/usuario/mi-partida',
    svgPath: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>'
  },
  {
    label: 'Reservas',
    route: '/usuario/reservas',
    svgPath: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
  },
  {
    label: 'Disponibilidad',
    route: '/usuario/disponibilidad',
    svgPath: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  },
  {
    label: '🔴 Espectador (TV)',
    route: '/usuario/espectador',
    svgPath: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'
  },
  {
    label: 'Cuentas (Hoy)',
    route: '/usuario/cuentas',
    svgPath: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
  },
  {
    label: 'Deudas (Historial)',
    route: '/usuario/deudas',
    svgPath: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'
  },
  {
    label: 'Productos',
    route: '/usuario/productos',
    svgPath: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'
  },
  {
    label: 'Mis Pedidos',
    route: '/usuario/pedidos',
    svgPath: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>'
  },
  {
    label: 'Mi perfil',
    route: '/usuario/perfil',
    svgPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  }
];
