import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Pedido {
  id: number;
  usuarioId: number;
  usuario?: {
    id: number;
    name: string;
    lastName: string;
  };
  venueId: number;
  recursoId?: number;
  recurso?: {
    id: number;
    code: string;
    gameType: string;
  };
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado';
  metodoPago?: 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta' | 'jcuecoins' | 'cuenta_mesa';
  subtotal: number;
  impuestos: number;
  propina: number;
  total: number;
  pagado: number;
  cambio: number;
  notas?: string;
  direccionEntrega?: string;
  gariteroId?: number;
  garitero?: {
    id: number;
    name: string;
    lastName: string;
  };
  fechaPreparacion?: Date;
  fechaEntregado?: Date;
  tiempoPreparacionMinutos: number;
  metadata?: {
    origen: 'mesa' | 'barra' | 'app' | 'telefono';
    prioridad: 'normal' | 'alta' | 'urgente';
    canalNotificacion: 'app' | 'sms' | 'email';
    ubicacionMesa?: string;
  };
  items: PedidoItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PedidoItem {
  id: number;
  pedidoId: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
    presentation?: string;
  };
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  notas?: string;
  personalizaciones?: {
    sinHielo?: boolean;
    extraAzucar?: boolean;
    tipoLeche?: string;
    temperatura?: 'frio' | 'caliente' | 'ambiente';
    adicionales?: Array<{
      nombre: string;
      precio: number;
    }>;
  };
  preparado: boolean;
  fechaPreparado?: Date;
  createdAt: Date;
}

export interface CreatePedidoDto {
  items: Array<{
    productId: number;
    cantidad: number;
    notas?: string;
    personalizaciones?: any;
  }>;
  recursoId?: number;
  notas?: string;
  metodoPago?: string;
  direccionEntrega?: string;
  metadata?: {
    origen: 'mesa' | 'barra' | 'app' | 'telefono';
    prioridad: 'normal' | 'alta' | 'urgente';
    canalNotificacion: 'app' | 'sms' | 'email';
    ubicacionMesa?: string;
  };
}

export interface EstadisticasPedidos {
  totalPedidos: number;
  pedidosPendientes: number;
  pedidosEnPreparacion: number;
  pedidosListos: number;
  pedidosEntregados: number;
  ingresosTotales: number;
  tiempoPromedioPreparacion: number;
  productosVendidos: number;
}

@Injectable({
  providedIn: 'root'
})
export class PedidosService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);

  // Signals para estado reactivo
  pedidosActivos = signal<Pedido[]>([]);
  pedidosUsuario = signal<Pedido[]>([]);
  estadisticasDiarias = signal<EstadisticasPedidos | null>(null);

  // Subjects para notificaciones en tiempo real
  private nuevoPedidoSubject = new BehaviorSubject<Pedido | null>(null);
  private pedidoActualizadoSubject = new BehaviorSubject<Pedido | null>(null);

  constructor() {
    // El polling agresivo fue removido para evitar spam de 403 en usuarios que no son admin/garitero.
    // Los componentes que requieran tiempo real deberían manejar su propio polling o usar WebSockets.
  }

  obtenerPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.API_URL}/pedidos`);
  }

  obtenerPedidosActivos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.API_URL}/pedidos/activos`).pipe(
      map(pedidos => {
        this.pedidosActivos.set(pedidos);
        return pedidos;
      })
    );
  }

  obtenerPedidosPorMesa(recursoId: number): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.API_URL}/pedidos/mesa/${recursoId}`);
  }

  obtenerPedido(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.API_URL}/pedidos/${id}`);
  }

  crearPedido(pedidoData: CreatePedidoDto): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.API_URL}/pedidos`, pedidoData);
  }

  actualizarEstado(pedidoId: number, estado: string, gariteroId?: number): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.API_URL}/pedidos/${pedidoId}/estado`, { estado, gariteroId });
  }

  iniciarPreparacion(pedidoId: number): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.API_URL}/pedidos/${pedidoId}/preparar`, {});
  }

  marcarComoListo(pedidoId: number): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.API_URL}/pedidos/${pedidoId}/listo`, {});
  }

  marcarComoEntregado(pedidoId: number, data?: { metodoPago?: string; pagado?: number }): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.API_URL}/pedidos/${pedidoId}/entregar`, data);
  }

  cancelarPedido(pedidoId: number, motivo?: string): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.API_URL}/pedidos/${pedidoId}/cancelar`, { motivo });
  }

  obtenerEstadisticasDiarias(): Observable<EstadisticasPedidos> {
    return this.http.get<EstadisticasPedidos>(`${this.API_URL}/pedidos/estadisticas/dia`).pipe(
      map(estadisticas => {
        this.estadisticasDiarias.set(estadisticas);
        return estadisticas;
      })
    );
  }

  obtenerProductosMasVendidos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/pedidos/estadisticas/productos-mas-vendidos`);
  }

  // Métodos utilitarios
  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      'pendiente': 'Pendiente',
      'en_preparacion': 'En Preparación',
      'listo': 'Listo para Entregar',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado'
    };
    return labels[estado] || estado;
  }

  getEstadoColor(estado: string): string {
    const colors: Record<string, string> = {
      'pendiente': '#f59e0b', // amber-500
      'en_preparacion': '#3b82f6', // blue-500
      'listo': '#10b981', // emerald-500
      'entregado': '#6b7280', // gray-500
      'cancelado': '#ef4444' // red-500
    };
    return colors[estado] || '#6b7280';
  }

  getMetodoPagoLabel(metodo: string): string {
    const labels: Record<string, string> = {
      'efectivo': 'Efectivo',
      'nequi': 'Nequi',
      'daviplata': 'Daviplata',
      'tarjeta': 'Tarjeta',
      'jcuecoins': 'JcueCoins',
      'cuenta_mesa': 'Cuenta Mesa'
    };
    return labels[metodo] || metodo;
  }

  getPrioridadIcon(prioridad: string): string {
    const icons: Record<string, string> = {
      'normal': 'clock',
      'alta': 'exclamation-triangle',
      'urgente': 'fire'
    };
    return icons[prioridad] || 'clock';
  }

  getPrioridadColor(prioridad: string): string {
    const colors: Record<string, string> = {
      'normal': '#6b7280',
      'alta': '#f59e0b',
      'urgente': '#ef4444'
    };
    return colors[prioridad] || '#6b7280';
  }

  calcularTiempoEspera(fecha: Date): string {
    const ahora = new Date();
    const diff = ahora.getTime() - new Date(fecha).getTime();
    const minutos = Math.floor(diff / 60000);
    
    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `${minutos} min`;
    
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `${horas}h ${minutos % 60}min`;
    
    return `${Math.floor(horas / 24)}d`;
  }

  // Métodos para notificaciones en tiempo real
  onNuevoPedido() {
    return this.nuevoPedidoSubject.asObservable();
  }

  onPedidoActualizado() {
    return this.pedidoActualizadoSubject.asObservable();
  }

  // Métodos para gestión de cuenta de mesa
  getCuentaMesa(recursoId: number): Observable<Pedido[]> {
    return this.obtenerPedidosPorMesa(recursoId).pipe(
      map(pedidos => pedidos.filter(p => p.estado !== 'cancelado'))
    );
  }

  getTotalCuentaMesa(recursoId: number): Observable<number> {
    return this.getCuentaMesa(recursoId).pipe(
      map(pedidos => pedidos.reduce((total, pedido) => total + pedido.total, 0))
    );
  }

  // Métodos para gariteros
  getPedidosAsignados(gariteroId: number): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.API_URL}/pedidos?gariteroId=${gariteroId}`);
  }

  getPedidosPendientes(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.API_URL}/pedidos/activos`).pipe(
      map(pedidos => pedidos.filter(p => p.estado === 'pendiente'))
    );
  }

  // Métodos para usuarios
  getMisPedidos(usuarioId: number): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.API_URL}/pedidos?usuarioId=${usuarioId}`);
  }

  // Método para crear pedido rápido desde mesa
  crearPedidoDesdeMesa(recursoId: number, items: any[]): Observable<Pedido> {
    return this.crearPedido({
      items,
      recursoId,
      metodoPago: 'cuenta_mesa',
      metadata: {
        origen: 'mesa',
        prioridad: 'normal',
        canalNotificacion: 'app',
        ubicacionMesa: `Mesa ${recursoId}`
      }
    });
  }
}
