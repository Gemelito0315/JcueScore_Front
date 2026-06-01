import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-inventario-garitero',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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
  
  // Filtros
  searchTerm = signal('');
  filterStatus = signal<'all' | 'low' | 'out'>('all');
  turnoId = signal<number | null>(null);

  form = this.fb.group({
    cantidad: [0, [Validators.required, Validators.min(1)]],
    notas: [''],
    pagadoCaja: [false],
    costoTotal: [0]
  });

  ngOnInit() { 
    this.loadProductos(); 
    this.loadTurnoActivo();

    // Resetear costoTotal si desmarcan la casilla
    this.form.get('pagadoCaja')?.valueChanges.subscribe(pagado => {
      if (!pagado) {
        this.form.patchValue({ costoTotal: 0 });
        this.form.get('costoTotal')?.clearValidators();
      } else {
        this.form.get('costoTotal')?.setValidators([Validators.required, Validators.min(1)]);
      }
      this.form.get('costoTotal')?.updateValueAndValidity();
    });
  }

  loadTurnoActivo() {
    this.http.get<any>(`${API}/operaciones/turno/activo`).subscribe({
      next: (t) => { if (t) this.turnoId.set(t.id); }
    });
  }

  loadProductos() {
    this.http.get<any[]>(`${API}/productos`).subscribe({
      next: p => {
        this.productos.set(p);
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
      }
    });
  }

  productosFiltrados = computed(() => {
    let prods = this.productos();
    
    // Filtro por búsqueda
    const term = this.searchTerm().toLowerCase();
    if (term) {
      prods = prods.filter(p => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
    }
    
    // Filtro por estado
    const status = this.filterStatus();
    if (status === 'out') {
      prods = prods.filter(p => p.stock <= 0);
    } else if (status === 'low') {
      prods = prods.filter(p => p.stock > 0 && p.stock <= p.minStock);
    }

    return prods;
  });

  onSearchChange(val: string) {
    this.searchTerm.set(val);
  }

  setFilter(status: 'all' | 'low' | 'out') {
    this.filterStatus.set(status);
  }

  openIngreso(p: any) {
    this.productoSeleccionado.set(p);
    this.form.reset({ cantidad: 1, pagadoCaja: false, costoTotal: 0, notas: '' });
    this.showModal.set(true);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    
    const p = this.productoSeleccionado();
    const vals = this.form.value;
    const nuevoStock = p.stock + (vals.cantidad ?? 0);
    
    // 1. Actualizar el stock del producto
    this.http.put(`${API}/productos/${p.id}`, { stock: nuevoStock }).subscribe({
      next: () => {
        
        // 2. Si se pagó con caja y hay turno activo, registrar el gasto
        if (vals.pagadoCaja && this.turnoId() && vals.costoTotal && vals.costoTotal > 0) {
          const gastoBody = {
            descripcion: `Surtido inventario: ${vals.cantidad}x ${p.name}. ${vals.notas ? '(' + vals.notas + ')' : ''}`,
            monto: Number(vals.costoTotal),
            tipo: 'inventario'
          };
          this.http.post(`${API}/operaciones/turno/${this.turnoId()}/gastos`, gastoBody).subscribe({
            next: () => this.finalizarSave(),
            error: () => this.finalizarSave() // Aún si falla el gasto, el stock se guardó
          });
        } else {
          this.finalizarSave();
        }
      },
      error: () => {
        alert('Error al actualizar el stock.');
        this.loading.set(false);
      }
    });
  }

  finalizarSave() {
    this.loadProductos(); 
    this.showModal.set(false); 
    this.loading.set(false);
  }

  getStockColor(p: any) {
    if (p.stock <= 0) return '#f87171';
    if (p.stock <= p.minStock) return '#fbbf24';
    return '#34d399';
  }
}
