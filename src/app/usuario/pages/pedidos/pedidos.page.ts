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
import { MatSnackBar } from '@angular/material/snack-bar';

import { PedidosService, Pedido, CreatePedidoDto } from '../../../core/services/pedidos.service';
import { MesasService } from '../../../core/services/mesas.service';

@Component({
  selector: 'app-pedidos-page',
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
    MatInputModule
  ],
  templateUrl: './pedidos.page.html',
  styleUrls: ['./pedidos.page.scss']
})
export class PedidosPage implements OnInit {
  private pedidosService = inject(PedidosService);
  private mesasService = inject(MesasService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  pedidos = signal<Pedido[]>([]);
  mesasDisponibles = signal<any[]>([]);
  productos = signal<any[]>([]);
  productosDemo = signal<any[]>([
    { id: 1, name: 'Coca-Cola 350ml', price: 3000, category: 'Bebidas' },
    { id: 2, name: 'Papas Margarita', price: 2500, category: 'Snacks' },
    { id: 3, name: 'Cerveza Aguila 350ml', price: 4000, category: 'Bebidas' },
    { id: 4, name: 'Sandwich de jamón', price: 8000, category: 'Comida' },
    { id: 5, name: 'Jugo Natural', price: 5000, category: 'Bebidas' },
    { id: 6, name: 'Nachos con queso', price: 12000, category: 'Snacks' },
    { id: 7, name: 'Café', price: 2000, category: 'Bebidas' },
    { id: 8, name: 'Hamburguesa', price: 15000, category: 'Comida' }
  ]);

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
    // Cargar pedidos del usuario
    this.pedidosService.getMisPedidos(1).subscribe({
      next: (pedidos) => {
        this.pedidos.set(pedidos);
      },
      error: (error) => {
        console.error('Error cargando pedidos:', error);
        // Cargar datos de demo si hay error
        this.cargarPedidosDemo();
      }
    });

    // Cargar mesas disponibles
    this.mesasService.obtenerMesasActivas().subscribe(mesas => {
      this.mesasDisponibles.set(mesas.filter((m: any) => m.status === 'available' || m.status === 'occupied'));
    });

    // Cargar productos
    this.productos.set(this.productosDemo());
  }

  cargarPedidosDemo() {
    const pedidosDemo: Pedido[] = [
      {
        id: 1,
        usuarioId: 1,
        usuario: { id: 1, name: 'Carlos', lastName: 'Rodríguez' },
        venueId: 1,
        recursoId: 1,
        recurso: { id: 1, code: 'Mesa 1', gameType: 'Billar' },
        estado: 'entregado',
        metodoPago: 'cuenta_mesa',
        subtotal: 10500,
        impuestos: 1995,
        propina: 0,
        total: 12495,
        pagado: 0,
        cambio: 0,
        notas: 'Sin hielo en la gaseosa',
        tiempoPreparacionMinutos: 8,
        items: [
          {
            id: 1,
            pedidoId: 1,
            productId: 1,
            product: { id: 1, name: 'Coca-Cola 350ml', price: 3000, presentation: '350ml' },
            cantidad: 2,
            precioUnitario: 3000,
            subtotal: 6000,
            personalizaciones: { sinHielo: true },
            preparado: true,
            createdAt: new Date()
          },
          {
            id: 2,
            pedidoId: 1,
            productId: 2,
            product: { id: 2, name: 'Papas Margarita', price: 2500, presentation: '45g' },
            cantidad: 1,
            precioUnitario: 2500,
            subtotal: 2500,
            preparado: true,
            createdAt: new Date()
          }
        ],
        createdAt: new Date(Date.now() - 30 * 60000),
        updatedAt: new Date(Date.now() - 22 * 60000)
      },
      {
        id: 2,
        usuarioId: 1,
        usuario: { id: 1, name: 'Carlos', lastName: 'Rodríguez' },
        venueId: 1,
        recursoId: 2,
        recurso: { id: 2, code: 'Mesa 2', gameType: 'Billar' },
        estado: 'en_preparacion',
        metodoPago: 'cuenta_mesa',
        subtotal: 8000,
        impuestos: 1520,
        propina: 0,
        total: 9520,
        pagado: 0,
        cambio: 0,
        notas: 'Extra caliente',
        tiempoPreparacionMinutos: 5,
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
            preparado: false,
            createdAt: new Date()
          }
        ],
        createdAt: new Date(Date.now() - 10 * 60000),
        updatedAt: new Date(Date.now() - 5 * 60000)
      }
    ];
    this.pedidos.set(pedidosDemo);
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
    if (!item.productId || item.cantidad <= 0) {
      this.snackBar.open('Selecciona un producto y cantidad válida', 'Cerrar', { duration: 3000 });
      return;
    }

    const producto = this.productos().find(p => p.id === item.productId);
    if (!producto) return;

    const pedidoActual = this.nuevoPedido();
    const nuevoItem = {
      productId: item.productId,
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

    this.snackBar.open(`${producto.name} agregado al pedido`, 'Cerrar', { duration: 2000 });
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
      this.snackBar.open('Agrega al menos un producto al pedido', 'Cerrar', { duration: 3000 });
      return;
    }

    this.procesando.set(true);

    this.pedidosService.crearPedido(pedido).subscribe({
      next: (nuevoPedido) => {
        this.snackBar.open('Pedido creado exitosamente', 'Cerrar', { duration: 3000 });
        this.ocultarFormulario();
        this.cargarDatos();
        this.procesando.set(false);
      },
      error: (error) => {
        console.error('Error creando pedido:', error);
        this.snackBar.open('Error al crear el pedido', 'Cerrar', { duration: 3000 });
        this.procesando.set(false);
      }
    });
  }

  cancelarPedido(pedidoId: number) {
    this.pedidosService.cancelarPedido(pedidoId, 'Cancelado por usuario').subscribe({
      next: () => {
        this.snackBar.open('Pedido cancelado', 'Cerrar', { duration: 3000 });
        this.cargarDatos();
      },
      error: (error) => {
        console.error('Error cancelando pedido:', error);
        this.snackBar.open('Error al cancelar el pedido', 'Cerrar', { duration: 3000 });
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
    return producto?.name || 'Producto no encontrado';
  }

  getProductoPrecio(productId: number): number {
    const producto = this.productos().find(p => p.id === productId);
    return producto?.price || 0;
  }
}
