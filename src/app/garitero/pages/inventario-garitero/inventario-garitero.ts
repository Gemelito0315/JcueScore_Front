import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-inventario-garitero',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventario-garitero.html',
  styleUrl: './inventario-garitero.scss'
})
export class InventarioGaritero implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  productos = signal<any[]>([]);
  showModal = signal(false);
  productoSeleccionado = signal<any>(null);
  loading = signal(false);

  form = this.fb.group({
    cantidad: [0, [Validators.required, Validators.min(1)]],
    notas: [''],
  });

  ngOnInit() { this.loadProductos(); }

  loadProductos() {
    this.http.get<any[]>(`${API}/productos`).subscribe({
      next: p => this.productos.set(p),
      error: () => {}
    });
  }

  openIngreso(p: any) {
    this.productoSeleccionado.set(p);
    this.form.reset({ cantidad: 1 });
    this.showModal.set(true);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const p = this.productoSeleccionado();
    const nuevoStock = p.stock + (this.form.value.cantidad ?? 0);
    this.http.put(`${API}/productos/${p.id}`, { stock: nuevoStock }).subscribe({
      next: () => { this.loadProductos(); this.showModal.set(false); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getStockColor(p: any) {
    if (p.stock <= 0) return '#f87171';
    if (p.stock <= p.minStock) return '#f59e0b';
    return '#34d399';
  }
}
