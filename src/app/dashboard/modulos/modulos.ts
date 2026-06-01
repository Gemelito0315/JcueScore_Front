import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000';

// Metadata visual para cada módulo conocido (no viene del backend)
const MODULE_META: Record<string, { icon: string; color: string; route: string }> = {
  users:       { icon: '👥', color: '#06b6d4', route: '/dashboard/usuarios' },
  roles:       { icon: '🛡️', color: '#fbbf24', route: '/dashboard/roles' },
  modules:     { icon: '🧩', color: '#a78bfa', route: '/dashboard/modulos' },
  clientes:    { icon: '🤝', color: '#34d399', route: '/dashboard/clientes' },
  productos:   { icon: '📦', color: '#f97316', route: '/dashboard/productos' },
  reservas:    { icon: '📅', color: '#60a5fa', route: '/dashboard/reservas-admin' },
  partidas:    { icon: '🎱', color: '#10b981', route: '/dashboard/partidas' },
  torneos:     { icon: '🏆', color: '#fbbf24', route: '/dashboard/torneos' },
  reportes:    { icon: '📊', color: '#ec4899', route: '/dashboard/reportes' },
  caja:        { icon: '💰', color: '#22d3ee', route: '/dashboard/caja' },
  deudas:      { icon: '💳', color: '#f43f5e', route: '/dashboard/deudas' },
  mesas:       { icon: '🎯', color: '#84cc16', route: '/dashboard/mesas' },
  leaderboard: { icon: '🥇', color: '#fb923c', route: '/dashboard/leaderboard' },
  pedidos:     { icon: '🛒', color: '#8b5cf6', route: '/dashboard/pedidos' },
  perfil:      { icon: '👤', color: '#64748b', route: '/usuario/perfil' },
};

@Component({
  selector: 'app-modulos',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modulos.html',
  styleUrl: './modulos.scss'
})
export class Modulos implements OnInit {
  private http = inject(HttpClient);
  private fb   = new FormBuilder();

  _modulos    = signal<any[]>([]);
  showModal   = signal(false);
  editingId   = signal<number | null>(null);
  loading     = signal(false);
  loadingData = signal(true);
  errorMsg    = signal('');
  searchQuery = signal('');

  modulos = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return q
      ? this._modulos().filter(m => m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q))
      : this._modulos();
  });

  get stats() {
    const all = this._modulos();
    return { total: all.length };
  }

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    description: ['', Validators.required],
  });

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loadingData.set(true);
    this.http.get<any[]>(`${API}/modules`).subscribe({
      next: mods => { this._modulos.set(mods); this.loadingData.set(false); },
      error: () => { this.errorMsg.set('Error al cargar módulos'); this.loadingData.set(false); }
    });
  }

  getMeta(name: string) {
    return MODULE_META[name] ?? { icon: '🔧', color: '#64748b', route: '#' };
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset();
    this.showModal.set(true);
  }

  openEdit(m: any) {
    this.editingId.set(m.id);
    this.form.patchValue({ name: m.name, description: m.description });
    this.showModal.set(true);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = this.form.value;
    const id  = this.editingId();

    // El backend solo tiene POST (crear) para módulos — PATCH si existe
    const req = id
      ? this.http.patch(`${API}/modules/${id}`, val)
      : this.http.post(`${API}/modules`, val);

    req.subscribe({
      next: () => { this.loading.set(false); this.closeModal(); this.loadData(); },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message;
        alert(Array.isArray(msg) ? msg[0] : msg || 'Error al guardar módulo');
      }
    });
  }

  closeModal() {
    this.showModal.set(false);
    this.form.reset();
    this.editingId.set(null);
  }

  setSearch(e: Event) {
    this.searchQuery.set((e.target as HTMLInputElement).value);
  }
}
