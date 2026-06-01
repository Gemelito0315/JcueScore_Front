import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { GeoService } from '../../../core/services/geo.service';

import { PedidosService, Pedido, CreatePedidoDto } from '../../../core/services/pedidos.service';
import { MesasService } from '../../../core/services/mesas.service';
import { ProductosService } from '../../../core/services/productos.service';
import { Auth } from '../../../auth/services/auth';

@Component({
  selector: 'app-pedidos-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedidos.page.html',
  styleUrls: ['./pedidos.page.scss']
})
export class PedidosPage implements OnInit {
  private pedidosService = inject(PedidosService);
  private mesasService = inject(MesasService);
  private productosService = inject(ProductosService);
  private auth = inject(Auth);
  private router = inject(Router);
  private snackBar = inject(SnackbarService);
  public geoService = inject(GeoService);

  pedidos = signal<Pedido[]>([]);
  mesasDisponibles = signal<any[]>([]);
  productos = signal<any[]>([]);

  // Formulario de nuevo pedido
  nuevoPedido = signal<CreatePedidoDto>({
    items: [],
    recursoId: undefined,
    notas: '',
    metodoPago: 'cuenta_mesa'
  });

  itemActual = signal({
    productId: 0,
    cantidad: 1,
    notas: '',
    personalizaciones: {}
  });

  mostrandoFormulario = signal(false);
  procesando = signal(false);

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    // Cargar pedidos del usuario autenticado
    const userId = this.auth.currentUser()?.id ?? 0;
    this.pedidosService.getMisPedidos(userId).subscribe({
      next: (pedidos) => {
        this.pedidos.set(pedidos);
      },
      error: (error) => {
        console.error('Error cargando pedidos:', error);
        // Fallback a array vacío si falla el backend
        this.pedidos.set([]);
      }
    });

    // Cargar mesas disponibles
    this.mesasService.obtenerMesasActivas().subscribe(mesas => {
      this.mesasDisponibles.set(mesas.filter((m: any) => m.status === 'available' || m.status === 'occupied'));
    });

    // Cargar productos reales desde el backend
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productos.set(productos.filter(p => p.isActive !== false));
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.snackBar.showError('No se pudieron cargar los productos');
      }
    });
  }

  mostrarFormularioNuevo() {
    this.mostrandoFormulario.set(true);
    this.nuevoPedido.set({
      items: [],
      recursoId: undefined,
      notas: '',
      metodoPago: 'cuenta_mesa'
    });
    this.itemActual.set({
      productId: 0,
      cantidad: 1,
      notas: '',
      personalizaciones: {}
    });
  }

  ocultarFormulario() {
    this.mostrandoFormulario.set(false);
  }

  agregarItem() {
    const item = this.itemActual();
    // En el HTML the default value is string "0" for the select
    const pId = Number(item.productId);

    if (!pId || item.cantidad <= 0) {
      this.snackBar.showWarning('Selecciona un producto y cantidad válida');
      return;
    }

    const producto = this.productos().find(p => p.id === pId);
    if (!producto) return;

    if (producto.stock !== undefined && item.cantidad > producto.stock) {
      this.snackBar.showWarning(`Stock insuficiente para ${producto.name}. Disponibles: ${producto.stock}`);
      return;
    }

    const pedidoActual = this.nuevoPedido();
    const nuevoItem = {
      productId: pId,
      cantidad: item.cantidad,
      notas: item.notas,
      personalizaciones: item.personalizaciones
    };

    pedidoActual.items.push(nuevoItem);
    this.nuevoPedido.set(pedidoActual);

    // Resetear item actual
    this.itemActual.set({
      productId: 0,
      cantidad: 1,
      notas: '',
      personalizaciones: {}
    });

    this.snackBar.showSuccess(`${producto.name} agregado al pedido`);
  }

  quitarItem(index: number) {
    const pedidoActual = this.nuevoPedido();
    pedidoActual.items.splice(index, 1);
    this.nuevoPedido.set(pedidoActual);
  }

  calcularSubtotal(): number {
    const pedido = this.nuevoPedido();
    return pedido.items.reduce((total, item) => {
      const producto = this.productos().find(p => p.id === item.productId);
      return total + (producto?.price || 0) * item.cantidad;
    }, 0);
  }

  calcularTotal(): number {
    const subtotal = this.calcularSubtotal();
    const impuestos = subtotal * 0.19;
    return subtotal + impuestos;
  }

  crearPedido() {
    const pedido = this.nuevoPedido();
    
    if (pedido.items.length === 0) {
      this.snackBar.showWarning('Agrega al menos un producto al pedido');
      return;
    }

    this.procesando.set(true);

    this.pedidosService.crearPedido(pedido).subscribe({
      next: (nuevoPedido) => {
        this.snackBar.showSuccess('Pedido creado exitosamente');
        this.ocultarFormulario();
        this.cargarDatos();
        this.procesando.set(false);
      },
      error: (error) => {
        console.error('Error creando pedido:', error);
        this.snackBar.showError('Error al crear el pedido');
        this.procesando.set(false);
      }
    });
  }

  cancelarPedido(pedidoId: number) {
    this.pedidosService.cancelarPedido(pedidoId, 'Cancelado por usuario').subscribe({
      next: () => {
        this.snackBar.showSuccess('Pedido cancelado');
        this.cargarDatos();
      },
      error: (error) => {
        console.error('Error cancelando pedido:', error);
        this.snackBar.showError('Error al cancelar el pedido');
      }
    });
  }

  getEstadoLabel(estado: string): string {
    return this.pedidosService.getEstadoLabel(estado);
  }

  getEstadoColor(estado: string): string {
    return this.pedidosService.getEstadoColor(estado);
  }

  getProductoNombre(productId: number): string {
    const producto = this.productos().find(p => p.id === productId);
    return producto?.name || 'Cargando...';
  }

  getProductoPrecio(productId: number): number {
    const producto = this.productos().find(p => p.id === productId);
    return producto?.price || 0;
  }
}
