import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Producto {
  id: number;
  name: string;
  description?: string;
  sku: string;
  price: number;
  cost: number;
  stock?: number;
  minStock?: number;
  unit?: string;
  brand?: string;
  presentation?: string;
  venueId: number;
  productTypeId: number;
  isActive?: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductoDto {
  venueId: number;
  productTypeId: number;
  name: string;
  description?: string;
  sku: string;
  price: number;
  cost: number;
  stock?: number;
  minStock?: number;
  unit?: string;
  brand?: string;
  presentation?: string;
  isActive?: boolean;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);

  // Signals para estado reactivo
  productos = signal<Producto[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.http.get<Producto[]>(`${this.API_URL}/productos`).subscribe({
      next: (productos) => {
        this.productos.set(productos);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.error.set('Error al cargar productos');
        this.loading.set(false);
        
        // Cargar productos de demo si hay error
        this.cargarProductosDemo();
      }
    });
  }

  private cargarProductosDemo(): void {
    const productosDemo: Producto[] = [
      {
        id: 1,
        name: 'Coca-Cola 350ml',
        description: 'Bebida gaseosa cola',
        sku: 'CC350',
        price: 3000,
        cost: 1500,
        stock: 50,
        minStock: 10,
        unit: 'unidad',
        brand: 'Coca-Cola',
        presentation: '350ml',
        venueId: 1,
        productTypeId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: 'Coca-Cola 500ml',
        description: 'Bebida gaseosa cola',
        sku: 'CC500',
        price: 4000,
        cost: 2000,
        stock: 40,
        minStock: 8,
        unit: 'unidad',
        brand: 'Coca-Cola',
        presentation: '500ml',
        venueId: 1,
        productTypeId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: 'Cerveza Aguila 350ml',
        description: 'Cerveza lager',
        sku: 'AG350',
        price: 4000,
        cost: 2500,
        stock: 30,
        minStock: 6,
        unit: 'unidad',
        brand: 'Bavaria',
        presentation: '350ml',
        venueId: 1,
        productTypeId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        name: 'Agua Purificada 500ml',
        description: 'Agua purificada',
        sku: 'AP500',
        price: 2000,
        cost: 800,
        stock: 60,
        minStock: 12,
        unit: 'unidad',
        brand: 'Cristal',
        presentation: '500ml',
        venueId: 1,
        productTypeId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        name: 'Jugo Natural Naranja',
        description: 'Jugo fresco de naranja',
        sku: 'JN500',
        price: 5000,
        cost: 2000,
        stock: 25,
        minStock: 5,
        unit: 'unidad',
        brand: 'Casa',
        presentation: '500ml',
        venueId: 1,
        productTypeId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 6,
        name: 'Papas Margarita Limón',
        description: 'Papas de maíz con sabor limón',
        sku: 'PM45',
        price: 2500,
        cost: 1200,
        stock: 80,
        minStock: 15,
        unit: 'unidad',
        brand: 'Margarita',
        presentation: '45g',
        venueId: 1,
        productTypeId: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 7,
        name: 'Papas Margarita Queso',
        description: 'Papas de maíz con sabor queso',
        sku: 'PMQ45',
        price: 2500,
        cost: 1200,
        stock: 75,
        minStock: 15,
        unit: 'unidad',
        brand: 'Margarita',
        presentation: '45g',
        venueId: 1,
        productTypeId: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 8,
        name: 'Nachos con Queso',
        description: 'Nachos con queso derretido',
        sku: 'NQ150',
        price: 12000,
        cost: 6000,
        stock: 15,
        minStock: 3,
        unit: 'porción',
        brand: 'Casa',
        presentation: '150g',
        venueId: 1,
        productTypeId: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 9,
        name: 'Sandwich Jamón Queso',
        description: 'Sandwich con jamón y queso',
        sku: 'SJQ',
        price: 8000,
        cost: 4000,
        stock: 10,
        minStock: 2,
        unit: 'unidad',
        brand: 'Casa',
        presentation: 'Completo',
        venueId: 1,
        productTypeId: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 10,
        name: 'Hamburguesa Completa',
        description: 'Hamburguesa con carne, lechuga, tomate',
        sku: 'HB',
        price: 15000,
        cost: 8000,
        stock: 8,
        minStock: 2,
        unit: 'unidad',
        brand: 'Casa',
        presentation: 'Completa',
        venueId: 1,
        productTypeId: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 11,
        name: 'Perro Caliente',
        description: 'Perro caliente con todos los ingredientes',
        sku: 'PC',
        price: 10000,
        cost: 5000,
        stock: 12,
        minStock: 2,
        unit: 'unidad',
        brand: 'Casa',
        presentation: 'Completo',
        venueId: 1,
        productTypeId: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 12,
        name: 'Café Americano',
        description: 'Café negro americano',
        sku: 'CA200',
        price: 2000,
        cost: 800,
        stock: 100,
        minStock: 20,
        unit: 'unidad',
        brand: 'Casa',
        presentation: '200ml',
        venueId: 1,
        productTypeId: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 13,
        name: 'Café con Leche',
        description: 'Café con leche vaporizada',
        sku: 'CL250',
        price: 3000,
        cost: 1200,
        stock: 80,
        minStock: 15,
        unit: 'unidad',
        brand: 'Casa',
        presentation: '250ml',
        venueId: 1,
        productTypeId: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 14,
        name: 'Brownie Chocolate',
        description: 'Brownie de chocolate',
        sku: 'BR',
        price: 6000,
        cost: 3000,
        stock: 20,
        minStock: 4,
        unit: 'unidad',
        brand: 'Casa',
        presentation: '80g',
        venueId: 1,
        productTypeId: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    this.productos.set(productosDemo);
  }

  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.API_URL}/productos`).pipe(
      map(productos => {
        this.productos.set(productos);
        return productos;
      })
    );
  }

  obtenerProducto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.API_URL}/productos/${id}`);
  }

  crearProducto(producto: CreateProductoDto): Observable<Producto> {
    return this.http.post<Producto>(`${this.API_URL}/productos`, producto).pipe(
      map(nuevoProducto => {
        this.productos.update(productos => [...productos, nuevoProducto]);
        return nuevoProducto;
      })
    );
  }

  actualizarProducto(id: number, producto: Partial<Producto>): Observable<Producto> {
    return this.http.put<Producto>(`${this.API_URL}/productos/${id}`, producto).pipe(
      map(productoActualizado => {
        this.productos.update(productos => 
          productos.map(p => p.id === id ? productoActualizado : p)
        );
        return productoActualizado;
      })
    );
  }

  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/productos/${id}`).pipe(
      map(() => {
        this.productos.update(productos => productos.filter(p => p.id !== id));
      })
    );
  }

  // Métodos utilitarios
  getProductosPorCategoria(productTypeId: number): Producto[] {
    return this.productos().filter(p => p.productTypeId === productTypeId);
  }

  getProductosConStock(): Producto[] {
    return this.productos().filter(p => (p.stock || 0) > 0);
  }

  getProductosBajoStock(): Producto[] {
    return this.productos().filter(p => (p.stock || 0) < (p.minStock || 0));
  }

  buscarProductos(query: string): Producto[] {
    const searchTerm = query.toLowerCase();
    return this.productos().filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm) ||
      p.brand?.toLowerCase().includes(searchTerm) ||
      p.sku.toLowerCase().includes(searchTerm)
    );
  }

  // Métodos para el usuario (productos disponibles para pedido)
  getProductosDisponibles(): Producto[] {
    return this.getProductosConStock().filter(p => p.isActive !== false);
  }

  getProductoPorSku(sku: string): Producto | undefined {
    return this.productos().find(p => p.sku === sku);
  }
}
