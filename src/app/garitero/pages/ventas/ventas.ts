import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000';

interface ItemVenta { id: number; nombre: string; precio: number; cantidad: number; }

@Component({
  selector: 'app-ventas',
  imports: [CommonModule],
  templateUrl: './ventas.html',
  styleUrl: './ventas.scss'
})
export class Ventas implements OnInit {
  private http = inject(HttpClient);

  productos = signal<any[]>([]);
  carrito = signal<ItemVenta[]>([]);
  ventas = signal<any[]>([]);
  metodoPago = signal<'efectivo' | 'transferencia'>('efectivo');

  ngOnInit() {
    this.http.get<any[]>(`${API}/productos`).subscribe({
      next: p => this.productos.set(p.filter(x => x.isActive)),
      error: () => {}
    });
  }

  agregarAlCarrito(p: any) {
    this.carrito.update(c => {
      const existe = c.find(i => i.id === p.id);
      if (existe) return c.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...c, { id: p.id, nombre: p.name, precio: p.price, cantidad: 1 }];
    });
  }

  quitarDelCarrito(id: number) {
    this.carrito.update(c => {
      const item = c.find(i => i.id === id);
      if (item && item.cantidad > 1) return c.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i);
      return c.filter(i => i.id !== id);
    });
  }

  get total() { return this.carrito().reduce((a, i) => a + i.precio * i.cantidad, 0); }

  cobrar() {
    if (this.carrito().length === 0) return;
    this.ventas.update(vs => [...vs, {
      id: Date.now(), items: [...this.carrito()], total: this.total,
      metodo: this.metodoPago(), hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    }]);
    this.carrito.set([]);
  }
}
