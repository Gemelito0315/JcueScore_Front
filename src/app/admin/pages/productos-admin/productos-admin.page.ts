import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ProductosService, Producto, CreateProductoDto } from '../../../core/services/productos.service';

import { DEFAULT_VENUE_ID } from '../../../core/constants';

@Component({
  selector: 'app-productos-admin-page',
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
    MatSnackBarModule,
    MatDialogModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './productos-admin.page.html',
  styleUrls: ['./productos-admin.page.scss']
})
export class ProductosAdminPage implements OnInit {
  private productosService = inject(ProductosService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  productos = signal<Producto[]>([]);
  productosFiltrados = signal<Producto[]>([]);
  loading = signal<boolean>(false);
  mostrandoFormulario = signal<boolean>(false);
  editandoProducto = signal<Producto | null>(null);

  // Formulario de producto
  productoForm = signal<FormGroup>(new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    sku: new FormControl('', [Validators.required]),
    price: new FormControl(0, [Validators.required, Validators.min(0)]),
    cost: new FormControl(0, [Validators.required, Validators.min(0)]),
    stock: new FormControl(0, [Validators.min(0)]),
    minStock: new FormControl(0, [Validators.min(0)]),
    unit: new FormControl('unidad'),
    brand: new FormControl(''),
    presentation: new FormControl(''),
    venueId: new FormControl(DEFAULT_VENUE_ID, [Validators.required]),
    productTypeId: new FormControl(1, [Validators.required]),
    isActive: new FormControl(true)
  }));

  // Filtros
  busqueda = signal<string>('');
  categoriaSeleccionada = signal<number>(0);
  estadoSeleccionado = signal<string>('todos');

  // Tablas
  displayedColumns: string[] = ['id', 'name', 'sku', 'price', 'stock', 'category', 'status', 'actions'];

  ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    this.loading.set(true);
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => {
        this.productos.set(productos);
        this.filtrarProductos();
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error cargando productos:', error);
        this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  filtrarProductos() {
    let filtrados = this.productos();

    // Filtrar por búsqueda
    if (this.busqueda()) {
      const searchTerm = this.busqueda().toLowerCase();
      filtrados = filtrados.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm) ||
        p.brand?.toLowerCase().includes(searchTerm) ||
        p.sku.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por categoría
    if (this.categoriaSeleccionada() > 0) {
      filtrados = filtrados.filter(p => p.productTypeId === this.categoriaSeleccionada());
    }

    // Filtrar por estado
    if (this.estadoSeleccionado() === 'activos') {
      filtrados = filtrados.filter(p => p.isActive !== false);
    } else if (this.estadoSeleccionado() === 'inactivos') {
      filtrados = filtrados.filter(p => p.isActive === false);
    }

    this.productosFiltrados.set(filtrados);
  }

  onBusquedaChange(event: any) {
    this.busqueda.set(event.target.value);
    this.filtrarProductos();
  }

  onCategoriaChange(categoriaId: number) {
    this.categoriaSeleccionada.set(categoriaId);
    this.filtrarProductos();
  }

  onEstadoChange(estado: string) {
    this.estadoSeleccionado.set(estado);
    this.filtrarProductos();
  }

  mostrarFormularioCrear() {
    this.editandoProducto.set(null);
    this.productoForm().reset({
      name: '',
      description: '',
      sku: '',
      price: 0,
      cost: 0,
      stock: 0,
      minStock: 0,
      unit: 'unidad',
      brand: '',
      presentation: '',
      venueId: DEFAULT_VENUE_ID,
      productTypeId: 1,
      isActive: true
    });
    this.mostrandoFormulario.set(true);
  }

  mostrarFormularioEditar(producto: Producto) {
    this.editandoProducto.set(producto);
    this.productoForm().setValue({
      name: producto.name,
      description: producto.description || '',
      sku: producto.sku,
      price: producto.price,
      cost: producto.cost,
      stock: producto.stock || 0,
      minStock: producto.minStock || 0,
      unit: producto.unit || 'unidad',
      brand: producto.brand || '',
      presentation: producto.presentation || '',
      venueId: producto.venueId,
      productTypeId: producto.productTypeId,
      isActive: producto.isActive !== false
    });
    this.mostrandoFormulario.set(true);
  }

  ocultarFormulario() {
    this.mostrandoFormulario.set(false);
    this.editandoProducto.set(null);
    this.productoForm().reset();
  }

  guardarProducto() {
    if (this.productoForm().invalid) {
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const productoData = this.productoForm().value;
    this.loading.set(true);

    if (this.editandoProducto()) {
      // Actualizar producto existente
      this.productosService.actualizarProducto(this.editandoProducto()!.id, productoData).subscribe({
        next: (productoActualizado) => {
          this.snackBar.open('Producto actualizado exitosamente', 'Cerrar', { duration: 3000 });
          this.ocultarFormulario();
          this.cargarProductos();
          this.loading.set(false);
        },
        error: (error: any) => {
          console.error('Error actualizando producto:', error);
          this.snackBar.open('Error al actualizar el producto', 'Cerrar', { duration: 3000 });
          this.loading.set(false);
        }
      });
    } else {
      // Crear nuevo producto
      this.productosService.crearProducto(productoData).subscribe({
        next: (nuevoProducto) => {
          this.snackBar.open('Producto creado exitosamente', 'Cerrar', { duration: 3000 });
          this.ocultarFormulario();
          this.cargarProductos();
          this.loading.set(false);
        },
        error: (error: any) => {
          console.error('Error creando producto:', error);
          this.snackBar.open('Error al crear el producto', 'Cerrar', { duration: 3000 });
          this.loading.set(false);
        }
      });
    }
  }

  eliminarProducto(producto: Producto) {
    if (confirm(`¿Estás seguro de eliminar el producto "${producto.name}"?`)) {
      this.productosService.eliminarProducto(producto.id).subscribe({
        next: () => {
          this.snackBar.open('Producto eliminado exitosamente', 'Cerrar', { duration: 3000 });
          this.cargarProductos();
        },
        error: (error: any) => {
          console.error('Error eliminando producto:', error);
          this.snackBar.open('Error al eliminar el producto', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  toggleEstadoProducto(producto: Producto) {
    const nuevoEstado = !producto.isActive;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    if (confirm(`¿Estás seguro de ${accion} el producto "${producto.name}"?`)) {
      this.productosService.actualizarProducto(producto.id, { isActive: nuevoEstado }).subscribe({
        next: () => {
          this.snackBar.open(`Producto ${accion}do exitosamente`, 'Cerrar', { duration: 3000 });
          this.cargarProductos();
        },
        error: (error: any) => {
          console.error('Error actualizando estado del producto:', error);
          this.snackBar.open(`Error al ${accion} el producto`, 'Cerrar', { duration: 3000 });
        }
      });
    }
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

  getStockColor(stock: number): string {
    if (stock <= 5) return '#ef4444'; // rojo
    if (stock <= 10) return '#f59e0b'; // amarillo
    return '#10b981'; // verde
  }

  getStockLabel(stock: number): string {
    if (stock <= 5) return 'Bajo';
    if (stock <= 10) return 'Medio';
    return 'Bueno';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getProfitMargin(price: number, cost: number): number {
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  }

  getProfitMarginColor(margin: number): string {
    if (margin < 10) return '#ef4444'; // rojo
    if (margin < 20) return '#f59e0b'; // amarillo
    return '#10b981'; // verde
  }

  irAPedidos() {
    this.router.navigate(['/admin/pedidos']);
  }

  irADashboard() {
    this.router.navigate(['/admin/dashboard']);
  }
}
