import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000';

const ROLE_COLORS: Record<string, string> = {
  Admin: '#fbbf24', Garitero: '#06b6d4', Usuario: '#34d399',
  Moderador: '#a78bfa', Invitado: '#64748b',
};
const DEFAULT_COLOR = '#818cf8';

@Component({
  selector: 'app-roles',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './roles.html',
  styleUrl: './roles.scss'
})
export class Roles implements OnInit {
  private http = inject(HttpClient);
  private fb   = new FormBuilder();

  _roles      = signal<any[]>([]);
  _modulos    = signal<any[]>([]);
  showModal   = signal(false);
  editingId   = signal<number | null>(null);
  loading     = signal(false);
  loadingData = signal(true);
  errorMsg    = signal('');
  selectedModuleIds = signal<number[]>([]);

  roles = computed(() => this._roles());

  get stats() {
    const all = this._roles();
    const totalUsers = all.reduce((s, r) => s + (r.users?.length ?? 0), 0);
    return { total: all.length, totalUsers };
  }

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
  });

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loadingData.set(true);
    this.http.get<any[]>(`${API}/roles`).subscribe({
      next: roles => { this._roles.set(roles); this.loadingData.set(false); },
      error: () => { this.errorMsg.set('Error al cargar roles'); this.loadingData.set(false); }
    });
    this.http.get<any[]>(`${API}/modules`).subscribe({
      next: mods => this._modulos.set(mods),
      error: () => {}
    });
  }

  getRoleColor(name: string): string {
    return ROLE_COLORS[name] ?? DEFAULT_COLOR;
  }

  getModulesLabel(role: any): string {
    const mods: any[] = role.modules ?? [];
    if (!mods.length) return 'Sin módulos';
    return mods.slice(0, 4).map((m: any) => m.name).join(', ') + (mods.length > 4 ? ` +${mods.length - 4}` : '');
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '' });
    this.selectedModuleIds.set([]);
    this.showModal.set(true);
  }

  openEdit(r: any) {
    this.editingId.set(r.id);
    this.form.patchValue({ name: r.name, description: r.description });
    this.selectedModuleIds.set((r.modules ?? []).map((m: any) => m.id));
    this.showModal.set(true);
  }

  toggleModule(id: number) {
    this.selectedModuleIds.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  hasModule(id: number): boolean {
    return this.selectedModuleIds().includes(id);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = this.form.value;
    const payload = { name: val.name, description: val.description, moduleIds: this.selectedModuleIds() };
    const id = this.editingId();
    const req = id
      ? this.http.patch(`${API}/roles/${id}`, payload)
      : this.http.post(`${API}/roles`, payload);

    req.subscribe({
      next: () => { this.loading.set(false); this.closeModal(); this.loadData(); },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message;
        alert(Array.isArray(msg) ? msg[0] : msg || 'Error al guardar rol');
      }
    });
  }

  delete(r: any) {
    if (r.id <= 3) { alert('Los roles base (Admin, Usuario, Garitero) no se pueden eliminar.'); return; }
    if (!confirm(`¿Eliminar el rol "${r.name}"? Esta acción es irreversible.`)) return;
    this.http.delete(`${API}/roles/${r.id}`).subscribe({
      next: () => this.loadData(),
      error: () => alert('Error al eliminar el rol')
    });
  }

  closeModal() {
    this.showModal.set(false);
    this.form.reset();
    this.selectedModuleIds.set([]);
    this.editingId.set(null);
  }
}
