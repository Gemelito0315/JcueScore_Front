import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
  private router = inject(Router);

  deudas = signal<any[]>([]);
  usuarios = signal<any[]>([]);
  showModal = signal(false);
  showPagoModal = signal(false);
  deudaSeleccionada = signal<any>(null);
  loading = signal(false);
  filtro = signal('todas');

  esCuentas = computed(() => this.router.url.includes('cuentas'));

  deudasPorModulo = computed(() => {
    const isCuentas = this.esCuentas();
    const todayStr = new Date().toDateString();
    return this.deudas().filter(d => {
      const createdToday = new Date(d.fechaCreacion).toDateString() === todayStr;
      return isCuentas ? createdToday : !createdToday;
    });
  });

  // Señales computadas reactivas para los contadores y filtros de resumen
  pendientesCount = computed(() => this.deudasPorModulo().filter(d => d.estado === 'pendiente').length);
  parcialesCount  = computed(() => this.deudasPorModulo().filter(d => d.estado === 'parcial').length);
  pagadasCount    = computed(() => this.deudasPorModulo().filter(d => d.estado === 'pagada').length);

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
    this.http.get<any[]>(`${API}/users`).subscribe(u => this.usuarios.set(u));
  }

  loadDeudas() {
    this.http.get<any[]>(`${API}/deudas`).subscribe({
      next: d => this.deudas.set(d),
      error: () => this.deudas.set([])
    });
  }

  getNombreCliente(d: any): string {
    if (d.esExterno || !d.name) return d.nombreCliente || 'Visitante';
    const lastName = d.lastName || '';
    return `${d.name} ${lastName}`.trim();
  }

  get deudasFiltradas() {
    if (this.filtro() === 'todas') return this.deudasPorModulo();
    return this.deudasPorModulo().filter(d => d.estado === this.filtro());
  }

  get totalPendiente() {
    return this.deudasPorModulo()
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
    const val = this.form.value;
    const payload = {
      userId:      Number(val.userId),
      descripcion: val.descripcion,
      monto:       Number(val.monto),
      notas:       val.notas || null,
    };
    this.http.post(`${API}/deudas`, payload).subscribe({
      next: () => { this.loadDeudas(); this.showModal.set(false); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message;
        alert(Array.isArray(msg) ? msg[0] : msg || 'Error al registrar deuda');
      }
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
      next: () => { this.loadDeudas(); this.showPagoModal.set(false); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  delete(id: number) {
    if (!confirm('¿Eliminar esta deuda?')) return;
    this.http.delete(`${API}/deudas/${id}`).subscribe(() => this.loadDeudas());
  }

  getEstadoColor(estado: string) {
    return { pendiente: '#f87171', parcial: '#f59e0b', pagada: '#10b981' }[estado] ?? '#64748b';
  }

  getPendiente(d: any) {
    return parseFloat(d.monto) - parseFloat(d.montoPagado);
  }
}
