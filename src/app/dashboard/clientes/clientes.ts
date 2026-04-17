import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-clientes-admin',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss'
})
export class ClientesAdmin implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  clientes = signal<any[]>([]);
  showModal = signal(false);
  editingId = signal<number | null>(null);
  loading = signal(false);
  busqueda = signal('');

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', Validators.required],
    phone: [''],
    docNumber: [''],
    notes: [''],
  });

  // Mock data (listo para conectar al back)
  ngOnInit() {
    this.http.get<any[]>(`${API}/users?rol=2`).subscribe({
      next: u => this.clientes.set(u),
      error: () => this.clientes.set([])
    });
  }

  get clientesFiltrados() {
    const q = this.busqueda().toLowerCase();
    if (!q) return this.clientes();
    return this.clientes().filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset();
    this.showModal.set(true);
  }

  openEdit(c: any) {
    this.editingId.set(c.id);
    this.form.patchValue(c);
    this.showModal.set(true);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    // Conectar al back: POST/PUT /clientes
    setTimeout(() => {
      this.showModal.set(false);
      this.loading.set(false);
    }, 500);
  }

  delete(id: number) {
    if (!confirm('¿Eliminar este cliente?')) return;
    this.clientes.update(cs => cs.filter(c => c.id !== id));
  }

  getNivelColor(nivel: string) {
    return { Oro: '#fbbf24', Plata: '#94a3b8', Bronce: '#f59e0b' }[nivel] ?? '#64748b';
  }

  getNivelIcon(nivel: string) {
    return { Oro: '🥇', Plata: '🥈', Bronce: '🥉' }[nivel] ?? '👤';
  }
}
