import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';

import { PedidosService, Pedido } from '../../../core/services/pedidos.service';
import { MesasService } from '../../../core/services/mesas.service';

@Component({
  selector: 'app-pedidos-garitero-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatBadgeModule
  ],
  templateUrl: './pedidos-garitero.page.html',
  styleUrls: ['./pedidos-garitero.page.scss']
})
export class PedidosGariteroPage implements OnInit {
  private pedidosService = inject(PedidosService);
  private mesasService = inject(MesasService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  pedidosActivos = signal<Pedido[]>([]);
  pedidosPendientes = signal<Pedido[]>([]);
  pedidosEnPreparacion = signal<Pedido[]>([]);
  pedidosListos = signal<Pedido[]>([]);
  pedidosEntregadosHoy = signal<Pedido[]>([]);
  
  estadisticas = signal({
    totalPedidos: 0,
    pendientes: 0,
    enPreparacion: 0,
    listos: 0,
    entregados: 0,
    ingresosTotales: 0,
    tiempoPromedio: 0
  });

  selectedTab = signal(0);
  actualizando = signal(false);

  ngOnInit() {
    this.cargarDatos();
    this.iniciarActualizacionAutomatica();
  }

  iniciarActualizacionAutomatica() {
    // Actualizar cada 15 segundos para no sobrecargar
    setInterval(() => {
      if (!this.actualizando()) {
        this.cargarPedidosActivos();
      }
    }, 15000);
  }

  cargarDatos() {
    this.cargarPedidosActivos();
    this.cargarEstadisticas();
  }

  cargarPedidosActivos() {
    this.actualizando.set(true);
    
    this.pedidosService.obtenerPedidosActivos().subscribe({
      next: (pedidos) => {
        this.pedidosActivos.set(pedidos);
        this.clasificarPedidos(pedidos);
        this.actualizando.set(false);
      },
      error: (error) => {
        console.error('Error cargando pedidos activos:', error);
        this.cargarPedidosDemo();
        this.actualizando.set(false);
      }
    });
  }

  clasificarPedidos(pedidos: Pedido[]) {
    this.pedidosPendientes.set(pedidos.filter(p => p.estado === 'pendiente'));
    this.pedidosEnPreparacion.set(pedidos.filter(p => p.estado === 'en_preparacion'));
    this.pedidosListos.set(pedidos.filter(p => p.estado === 'listo'));
  }

  cargarEstadisticas() {
    this.pedidosService.obtenerEstadisticasDiarias().subscribe({
      next: (stats) => {
        this.estadisticas.set({
          totalPedidos: stats.totalPedidos,
          pendientes: stats.pedidosPendientes,
          enPreparacion: stats.pedidosEnPreparacion,
          listos: stats.pedidosListos,
          entregados: stats.pedidosEntregados,
          ingresosTotales: stats.ingresosTotales,
          tiempoPromedio: stats.tiempoPromedioPreparacion
        });
      },
      error: (error) => {
        console.error('Error cargando estadísticas:', error);
        // Cargar estadísticas de demo
        this.estadisticas.set({
          totalPedidos: 28,
          pendientes: 3,
          enPreparacion: 5,
          listos: 2,
          entregados: 18,
          ingresosTotales: 456000,
          tiempoPromedio: 12
        });
      }
    });
  }

  cargarPedidosDemo() {
    const ahora = new Date();
    const pedidosDemo: Pedido[] = [
      {
        id: 1,
        usuarioId: 1,
        usuario: { id: 1, name: 'Carlos', lastName: 'Rodríguez' },
        venueId: 1,
        recursoId: 1,
        recurso: { id: 1, code: 'Mesa 1', gameType: 'Billar' },
        estado: 'pendiente',
        metodoPago: 'cuenta_mesa',
        subtotal: 5500,
        impuestos: 1045,
        propina: 0,
        total: 6545,
        pagado: 0,
        cambio: 0,
        notas: 'Sin hielo en la gaseosa',
        tiempoPreparacionMinutos: 0,
        items: [
          {
            id: 1,
            pedidoId: 1,
            productId: 1,
            product: { id: 1, name: 'Coca-Cola 350ml', price: 3000, presentation: '350ml' },
            cantidad: 1,
            precioUnitario: 3000,
            subtotal: 3000,
            personalizaciones: { sinHielo: true },
            preparado: false,
            createdAt: new Date(ahora.getTime() - 5 * 60000)
          },
          {
            id: 2,
            pedidoId: 1,
            productId: 2,
            product: { id: 2, name: 'Papas Margarita', price: 2500, presentation: '45g' },
            cantidad: 1,
            precioUnitario: 2500,
            subtotal: 2500,
            preparado: false,
            createdAt: new Date(ahora.getTime() - 5 * 60000)
          }
        ],
        createdAt: new Date(ahora.getTime() - 5 * 60000),
        updatedAt: new Date(ahora.getTime() - 5 * 60000)
      },
      {
        id: 2,
        usuarioId: 2,
        usuario: { id: 2, name: 'Andrés', lastName: 'Martínez' },
        venueId: 1,
        recursoId: 2,
        recurso: { id: 2, code: 'Mesa 2', gameType: 'Billar' },
        estado: 'en_preparacion',
        metodoPago: 'efectivo',
        subtotal: 15000,
        impuestos: 2850,
        propina: 0,
        total: 17850,
        pagado: 20000,
        cambio: 2150,
        notas: 'Extra caliente',
        tiempoPreparacionMinutos: 8,
        items: [
          {
            id: 3,
            pedidoId: 2,
            productId: 8,
            product: { id: 8, name: 'Hamburguesa', price: 15000, presentation: 'Completa' },
            cantidad: 1,
            precioUnitario: 15000,
            subtotal: 15000,
            personalizaciones: { temperatura: 'caliente' },
            preparado: true,
            fechaPreparado: new Date(ahora.getTime() - 3 * 60000),
            createdAt: new Date(ahora.getTime() - 8 * 60000)
          }
        ],
        fechaPreparacion: new Date(ahora.getTime() - 8 * 60000),
        createdAt: new Date(ahora.getTime() - 8 * 60000),
        updatedAt: new Date(ahora.getTime() - 3 * 60000)
      },
      {
        id: 3,
        usuarioId: 3,
        usuario: { id: 3, name: 'Luis', lastName: 'Pérez' },
        venueId: 1,
        recursoId: 3,
        recurso: { id: 3, code: 'Mesa 3', gameType: 'Tres Bandas' },
        estado: 'listo',
        metodoPago: 'nequi',
        subtotal: 8000,
        impuestos: 1520,
        propina: 0,
        total: 9520,
        pagado: 9520,
        cambio: 0,
        tiempoPreparacionMinutos: 6,
        items: [
          {
            id: 4,
            pedidoId: 3,
            productId: 5,
            product: { id: 5, name: 'Jugo Natural', price: 5000, presentation: '500ml' },
            cantidad: 1,
            precioUnitario: 5000,
            subtotal: 5000,
            preparado: true,
            fechaPreparado: new Date(ahora.getTime() - 6 * 60000),
            createdAt: new Date(ahora.getTime() - 10 * 60000)
          },
          {
            id: 5,
            pedidoId: 3,
            productId: 7,
            product: { id: 7, name: 'Café', price: 2000, presentation: '200ml' },
            cantidad: 1,
            precioUnitario: 2000,
            subtotal: 2000,
            preparado: true,
            fechaPreparado: new Date(ahora.getTime() - 6 * 60000),
            createdAt: new Date(ahora.getTime() - 10 * 60000)
          }
        ],
        fechaPreparacion: new Date(ahora.getTime() - 10 * 60000),
        createdAt: new Date(ahora.getTime() - 10 * 60000),
        updatedAt: new Date(ahora.getTime() - 6 * 60000)
      }
    ];

    this.pedidosActivos.set(pedidosDemo);
    this.clasificarPedidos(pedidosDemo);
  }

  // Acciones sobre pedidos
  iniciarPreparacion(pedidoId: number) {
    this.pedidosService.iniciarPreparacion(pedidoId).subscribe({
      next: () => {
        this.snackBar.open('Pedido en preparación', 'Cerrar', { duration: 2000 });
        this.cargarPedidosActivos();
      },
      error: (error) => {
        console.error('Error iniciando preparación:', error);
        this.snackBar.open('Error al iniciar preparación', 'Cerrar', { duration: 3000 });
      }
    });
  }

  marcarComoListo(pedidoId: number) {
    this.pedidosService.marcarComoListo(pedidoId).subscribe({
      next: () => {
        this.snackBar.open('Pedido listo para entrega', 'Cerrar', { duration: 2000 });
        this.cargarPedidosActivos();
      },
      error: (error) => {
        console.error('Error marcando como listo:', error);
        this.snackBar.open('Error al marcar como listo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  entregarPedido(pedidoId: number) {
    this.pedidosService.marcarComoEntregado(pedidoId).subscribe({
      next: () => {
        this.snackBar.open('Pedido entregado', 'Cerrar', { duration: 2000 });
        this.cargarPedidosActivos();
        this.cargarEstadisticas();
      },
      error: (error) => {
        console.error('Error entregando pedido:', error);
        this.snackBar.open('Error al entregar pedido', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cancelarPedido(pedidoId: number) {
    const motivo = prompt('Motivo de cancelación:');
    if (motivo) {
      this.pedidosService.cancelarPedido(pedidoId, motivo).subscribe({
        next: () => {
          this.snackBar.open('Pedido cancelado', 'Cerrar', { duration: 2000 });
          this.cargarPedidosActivos();
        },
        error: (error) => {
          console.error('Error cancelando pedido:', error);
          this.snackBar.open('Error al cancelar pedido', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  // Utilitarios
  getEstadoLabel(estado: string): string {
    return this.pedidosService.getEstadoLabel(estado);
  }

  getEstadoColor(estado: string): string {
    return this.pedidosService.getEstadoColor(estado);
  }

  getTiempoEspera(fecha: Date): string {
    return this.pedidosService.calcularTiempoEspera(fecha);
  }

  getPrioridadIcon(prioridad: string): string {
    return this.pedidosService.getPrioridadIcon(prioridad);
  }

  getPrioridadColor(prioridad: string): string {
    return this.pedidosService.getPrioridadColor(prioridad);
  }

  getProductoNombre(productId: number): string {
    const productosDemo: Record<number, string> = {
      1: 'Coca-Cola 350ml',
      2: 'Papas Margarita',
      3: 'Cerveza Aguila 350ml',
      4: 'Sandwich de jamón',
      5: 'Jugo Natural',
      6: 'Nachos con queso',
      7: 'Café',
      8: 'Hamburguesa'
    };
    return productosDemo[productId] || 'Producto no encontrado';
  }

  // Actualización manual
  actualizarDatos() {
    this.cargarDatos();
  }
}
