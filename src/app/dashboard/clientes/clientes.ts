import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface Cliente {
  id: number;
  name: string;
  lastName: string;
  docType: string;
  docNumber: string;
  email: string;
  phone: string;
  totalPartidas: number;
  isActive: boolean;
  registeredAt: string;
}

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

  /** Datos reactivos */
  private _clientes = signal<Cliente[]>([]);
  filtro    = signal('');
  showModal = signal(false);
  showDetail = signal(false);
  editingId = signal<number | null>(null);
  detailCliente = signal<Cliente | null>(null);
  loading   = signal(false);

  readonly docTypes = ['CC', 'TI', 'CE', 'PP', 'PEP'] as const;

  /** Lista filtrada reactiva */
  clientes = computed(() => {
    const q = this.filtro().toLowerCase().trim();
    if (!q) return this._clientes();
    return this._clientes().filter(c =>
      `${c.name} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.docNumber || '').includes(q)
    );
  });

  get stats() {
    const all = this._clientes();
    return {
      total:    all.length,
      activos:  all.filter(c => c.isActive).length,
      partidas: all.reduce((s, c) => s + c.totalPartidas, 0),
    };
  }

  form = this.fb.group({
    name:       ['', [Validators.required, Validators.minLength(2)]],
    lastName:   ['', [Validators.required, Validators.minLength(2)]],
    docType:    ['CC', Validators.required],
    docNumber:  ['', Validators.required],
    email:      ['', [Validators.required, Validators.email]],
    phone:      ['', Validators.required],
    isActive:   [true],
  });

  ngOnInit() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<any[]>(`${API}/clientes`).subscribe({
      next: (data) => {
        const mapped: Cliente[] = data.map(c => ({
          id: c.id,
          name: c.name,
          lastName: c.lastName,
          docType: c.docType || 'CC',
          docNumber: c.docNumber || '000000000',
          email: c.email || '',
          phone: c.phone || '',
          totalPartidas: c.totalPartidas || 0,
          isActive: c.isActive !== false,
          registeredAt: c.createdAt ? c.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        this._clientes.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando clientes:', err);
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ docType: 'CC', isActive: true });
    this.showModal.set(true);
  }

  openEdit(c: Cliente): void {
    this.editingId.set(c.id);
    this.form.patchValue(c);
    this.showModal.set(true);
  }

  openDetail(c: Cliente): void {
    this.detailCliente.set(c);
    this.showDetail.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = this.form.value;

    const payload = {
      name: val.name,
      lastName: val.lastName,
      docType: val.docType,
      docNumber: val.docNumber,
      email: val.email,
      phone: val.phone,
      isActive: val.isActive,
      loyaltyPoints: 0
    };

    const req = this.editingId()
      ? this.http.put(`${API}/clientes/${this.editingId()}`, payload)
      : this.http.post(`${API}/clientes`, payload);

    req.subscribe({
      next: () => {
        this.load();
        this.showModal.set(false);
      },
      error: (err) => {
        console.error('Error guardando cliente:', err);
        this.loading.set(false);
      }
    });
  }

  toggleActive(c: Cliente): void {
    this.http.put(`${API}/clientes/${c.id}`, {
      ...c,
      isActive: !c.isActive
    }).subscribe({
      next: () => this.load(),
      error: (err) => console.error('Error alternando estado:', err)
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este cliente?')) return;
    this.http.delete(`${API}/clientes/${id}`).subscribe({
      next: () => this.load(),
      error: (err) => console.error('Error eliminando cliente:', err)
    });
  }

  closeModal(): void {
    this.showModal.set(false);
    this.form.reset();
  }
}
