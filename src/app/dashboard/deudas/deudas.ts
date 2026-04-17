import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-deudas',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deudas.html',
  styleUrl: './deudas.scss'
})
export class Deudas implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  deudas = signal<any[]>([]);
  usuarios = signal<any[]>([]);
  resumen = signal({ pendientes: 0, parciales: 0, pagadas: 0, total_pendiente: 0 });
  showModal = signal(false);
  showPagoModal = signal(false);
  deudaSeleccionada = signal<any>(null);
  loading = signal(false);
  filtro = signal('todas');

  form = this.fb.group({
    userId: [null, Validators.required],
    descripcion: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(1)]],
    notas: [''],
  });

  pagoForm = this.fb.group({
    montoPago: [0, [Validators.required, Validators.min(1)]],
  });

  ngOnInit() {
    this.loadDeudas();
    this.loadResumen();
    this.http.get<any[]>(`${API}/users`).subscribe(u => this.usuarios.set(u));
  }

  loadDeudas() {
    this.http.get<any[]>(`${API}/deudas`).subscribe({
      next: d => this.deudas.set(d),
      error: () => this.deudas.set(this.mockDeudas)
    });
  }

  loadResumen() {
    this.http.get<any>(`${API}/deudas/resumen`).subscribe({
      next: r => this.resumen.set(r),
      error: () => {}
    });
  }

  // Mock mientras se conecta el back
  mockDeudas = [
    { id: 1, name: 'Carlos', lastName: 'Rodríguez', descripcion: 'Partida del 8 de abril', monto: 25000, montoPagado: 0, estado: 'pendiente', fechaCreacion: '2026-04-08', notas: 'Prometió pagar el viernes' },
    { id: 2, name: 'Andrés', lastName: 'Martínez', descripcion: 'Bebidas + partida', monto: 35000, montoPagado: 15000, estado: 'parcial', fechaCreacion: '2026-04-07', notas: '' },
    { id: 3, name: 'Luis', lastName: 'Pérez', descripcion: 'Partida del 5 de abril', monto: 20000, montoPagado: 20000, estado: 'pagada', fechaCreacion: '2026-04-05', notas: '' },
  ];

  get deudasFiltradas() {
    if (this.filtro() === 'todas') return this.deudas();
    return this.deudas().filter(d => d.estado === this.filtro());
  }

  get totalPendiente() {
    return this.deudas()
      .filter(d => d.estado !== 'pagada')
      .reduce((a, d) => a + (parseFloat(d.monto) - parseFloat(d.montoPagado)), 0);
  }

  openCreate() {
    this.form.reset({ monto: 0 });
    this.showModal.set(true);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.http.post(`${API}/deudas`, this.form.value).subscribe({
      next: () => { this.loadDeudas(); this.loadResumen(); this.showModal.set(false); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openPago(deuda: any) {
    this.deudaSeleccionada.set(deuda);
    const pendiente = parseFloat(deuda.monto) - parseFloat(deuda.montoPagado);
    this.pagoForm.patchValue({ montoPago: pendiente });
    this.showPagoModal.set(true);
  }

  registrarPago() {
    if (this.pagoForm.invalid) return;
    this.loading.set(true);
    const id = this.deudaSeleccionada()?.id;
    this.http.post(`${API}/deudas/${id}/pago`, this.pagoForm.value).subscribe({
      next: () => { this.loadDeudas(); this.loadResumen(); this.showPagoModal.set(false); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  delete(id: number) {
    if (!confirm('¿Eliminar esta deuda?')) return;
    this.http.delete(`${API}/deudas/${id}`).subscribe(() => this.loadDeudas());
  }

  getEstadoColor(estado: string) {
    return { pendiente: '#f87171', parcial: '#f59e0b', pagada: '#34d399' }[estado] ?? '#64748b';
  }

  getPendiente(d: any) {
    return parseFloat(d.monto) - parseFloat(d.montoPagado);
  }
}
