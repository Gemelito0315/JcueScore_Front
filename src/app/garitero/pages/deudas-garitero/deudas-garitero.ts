import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-deudas-garitero',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deudas-garitero.html',
  styleUrl: './deudas-garitero.scss'
})
export class DeudasGaritero implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  deudas = signal<any[]>([]);
  usuarios = signal<any[]>([]);
  showModal = signal(false);
  showPagoModal = signal(false);
  deudaSeleccionada = signal<any>(null);
  loading = signal(false);

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
    this.http.get<any[]>(`${API}/users`).subscribe({ next: u => this.usuarios.set(u), error: () => {} });
  }

  loadDeudas() {
    this.http.get<any[]>(`${API}/deudas`).subscribe({
      next: d => this.deudas.set(d.filter(x => x.estado !== 'pagada')),
      error: () => {}
    });
  }

  get totalPendiente() {
    return this.deudas().reduce((a, d) => a + (parseFloat(d.monto) - parseFloat(d.montoPagado)), 0);
  }

  openPago(d: any) {
    this.deudaSeleccionada.set(d);
    this.pagoForm.patchValue({ montoPago: parseFloat(d.monto) - parseFloat(d.montoPagado) });
    this.showPagoModal.set(true);
  }

  registrarPago() {
    if (this.pagoForm.invalid) return;
    this.loading.set(true);
    this.http.post(`${API}/deudas/${this.deudaSeleccionada()?.id}/pago`, this.pagoForm.value).subscribe({
      next: () => { this.loadDeudas(); this.showPagoModal.set(false); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.http.post(`${API}/deudas`, this.form.value).subscribe({
      next: () => { this.loadDeudas(); this.showModal.set(false); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getEstadoColor(estado: string) {
    return { pendiente: '#f87171', parcial: '#f59e0b' }[estado] ?? '#64748b';
  }

  getPendiente(d: any) { return parseFloat(d.monto) - parseFloat(d.montoPagado); }
}
