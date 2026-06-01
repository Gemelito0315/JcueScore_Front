import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SnackbarService } from '../../../core/services/snackbar.service';

import { ProductosService, Producto } from '../../../core/services/productos.service';
import { PedidosService, CreatePedidoDto } from '../../../core/services/pedidos.service';
import { MesasService } from '../../../core/services/mesas.service';

@Component({
  selector: 'app-productos-usuario-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos-usuario.page.html',
  styleUrls: ['./productos-usuario.page.scss']
})
export class ProductosUsuarioPage implements OnInit {
  private http = inject(HttpClient);
  private productosService = inject(ProductosService);
  private pedidosService = inject(PedidosService);
  private mesasService = inject(MesasService);
  private router = inject(Router);
  private snackBar = inject(SnackbarService);

  productos = signal<Producto[]>([]);
  productosFiltrados = signal<Producto[]>([]);
  mesasDisponibles = signal<any[]>([]);
  carrito = signal<any[]>([]);
  categoriaSeleccionada = signal<number>(0);
  busqueda = signal<string>('');
  mostrandoCarrito = signal<boolean>(false);

  // Formulario de pedido
  nuevoPedido = signal<CreatePedidoDto>({
    items: [],
    recursoId: undefined,
    notas: '',
    metodoPago: 'cuenta_mesa'
  });

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    // Cargar productos
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productos.set(productos);
        this.filtrarProductos();
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.snackBar.showError('Error al cargar productos');
      }
    });

    // Cargar mesas disponibles
    this.mesasService.obtenerMesasActivas().subscribe(mesas => {
      this.mesasDisponibles.set(mesas.filter(m => m.status === 'available' || m.status === 'occupied'));
    });

    // Cargar partida activa para auto-asignar mesa
    this.http.get<any>(`http://localhost:3000/partidas/me/activa`).subscribe({
      next: (partida) => {
        if (partida) {
          this.nuevoPedido.update(n => ({
            ...n,
            recursoId: partida.recursoId,
            metodoPago: 'cuenta_mesa'
          }));
          this.snackBar.showSuccess(`Tu pedido se cargará automáticamente a tu ${partida.recursoCode}`);
        }
      }
    });
  }

  filtrarProductos() {
    let filtrados = this.productos().filter(p => p.isActive !== false);
    
    // Filtrar por categoría
    if (this.categoriaSeleccionada() > 0) {
      filtrados = filtrados.filter(p => p.productTypeId === this.categoriaSeleccionada());
    }
    
    // Filtrar por búsqueda
    if (this.busqueda()) {
      const searchTerm = this.busqueda().toLowerCase();
      filtrados = filtrados.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm) ||
        p.brand?.toLowerCase().includes(searchTerm)
      );
    }
    
    this.productosFiltrados.set(filtrados);
  }

  onCategoriaChange(categoriaId: number) {
    this.categoriaSeleccionada.set(categoriaId);
    this.filtrarProductos();
  }

  onBusquedaChange(event: any) {
    this.busqueda.set(event.target.value);
    this.filtrarProductos();
  }

  agregarAlCarrito(producto: Producto) {
    if ((producto.stock || 0) <= 0) {
      this.snackBar.showWarning('Producto sin stock disponible');
      return;
    }

    const itemActual = {
      productId: producto.id,
      cantidad: 1,
      notas: '',
      personalizaciones: {},
      producto: producto
    };

    // Verificar si ya está en el carrito
    const carritoActual = this.carrito();
    const itemExistente = carritoActual.find(item => item.productId === producto.id);
    
    if (itemExistente) {
      itemExistente.cantidad++;
      this.carrito.set([...carritoActual]);
    } else {
      this.carrito.set([...carritoActual, itemActual]);
    }

    this.snackBar.showSuccess(`${producto.name} agregado al carrito`);
  }

  quitarDelCarrito(index: number) {
    const carritoActual = this.carrito();
    carritoActual.splice(index, 1);
    this.carrito.set([...carritoActual]);
  }

  actualizarCantidad(index: number, cantidad: number) {
    if (cantidad <= 0) {
      this.quitarDelCarrito(index);
      return;
    }

    const carritoActual = this.carrito();
    const item = carritoActual[index];
    
    if (item.producto && cantidad > (item.producto.stock || 0)) {
      this.snackBar.showWarning('Stock insuficiente');
      return;
    }

    item.cantidad = cantidad;
    this.carrito.set([...carritoActual]);
  }

  calcularSubtotal(): number {
    return this.carrito().reduce((total, item) => {
      return total + (item.producto?.price || 0) * item.cantidad;
    }, 0);
  }

  calcularTotal(): number {
    const subtotal = this.calcularSubtotal();
    const impuestos = subtotal * 0.19;
    return subtotal + impuestos;
  }

  getTotalItems(): number {
    return this.carrito().reduce((total, item) => total + item.cantidad, 0);
  }

  crearPedidoDesdeCarrito() {
    if (this.carrito().length === 0) {
      this.snackBar.showWarning('El carrito está vacío');
      return;
    }

    const pedidoData: CreatePedidoDto = {
      items: this.carrito().map(item => ({
        productId: item.productId,
        cantidad: item.cantidad,
        notas: item.notas,
        personalizaciones: item.personalizaciones
      })),
      recursoId: this.nuevoPedido().recursoId,
      notas: this.nuevoPedido().notas,
      metodoPago: this.nuevoPedido().metodoPago
    };

    this.pedidosService.crearPedido(pedidoData).subscribe({
      next: (nuevoPedido) => {
        this.snackBar.showSuccess('Pedido creado exitosamente');
        this.carrito.set([]);
        this.mostrandoCarrito.set(false);
        this.router.navigate(['/usuario/pedidos']);
      },
      error: (error) => {
        console.error('Error creando pedido:', error);
        this.snackBar.showError('Error al crear el pedido');
      }
    });
  }

  verCarrito() {
    this.mostrandoCarrito.set(true);
  }

  ocultarCarrito() {
    this.mostrandoCarrito.set(false);
  }

  irAPedidos() {
    this.router.navigate(['/usuario/pedidos']);
  }

  // Métodos utilitarios
  getCategoriaNombre(productTypeId: number): string {
    const categorias: Record<number, string> = {
      1: 'Bebidas',
      2: 'Snacks',
      3: 'Comida',
      4: 'Café',
      5: 'Postres'
    };
    return categorias[productTypeId] || 'Otros';
  }

  getCategoriaIcon(productTypeId: number): string {
    const iconos: Record<number, string> = {
      1: '🥤',
      2: '🍿',
      3: '🍔',
      4: '☕',
      5: '🍰'
    };
    return iconos[productTypeId] || '📦';
  }

  getStockColor(stock: number): string {
    if (stock <= 5) return '#ef4444'; // rojo
    if (stock <= 10) return '#f59e0b'; // amarillo
    return '#10b981'; // verde
  }

  getStockLabel(stock: number): string {
    if (stock <= 5) return 'Stock Bajo';
    if (stock <= 10) return 'Stock Medio';
    return 'Stock Disponible';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
