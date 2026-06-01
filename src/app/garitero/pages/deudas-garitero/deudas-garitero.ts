import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-deudas-garitero',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './deudas-garitero.html',
  styleUrl: './deudas-garitero.scss'
})
export class DeudasGaritero implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  deudas            = signal<any[]>([]);
  usuarios          = signal<any[]>([]);
  showModal         = signal(false);
  showPagoModal     = signal(false);
  deudaSeleccionada = signal<any>(null);
  loading           = signal(false);
  errorMsg          = signal('');

  // Shift status
  turnoActivo = signal(false);

  // Archive to History Modal signals
  showConfirmarPasarHistorial = signal(false);
  deudaParaPasarHistorial = signal<any>(null);

  // Pestaña activa: 'activas' (clientes en sala con cuenta pendiente) | 'pagadas' (historial de pagadas hoy)
  tabActiva = signal<'activas' | 'pagadas'>('activas');

  // Modo de creación de deuda
  modoCliente = signal<'registrado' | 'externo'>('registrado');

  esCuentas = computed(() => this.router.url.includes('cuentas'));

  mesasActivas = signal<any[]>([]);
  intervalId: any;

  // Señales computadas reactivas
  cuentasActivas = computed(() => {
    // Si estamos en Historial de Deudas, no mostramos mesas vivas (solo deudas no pagadas en DB)
    if (!this.esCuentas()) {
      return this.deudas().filter(d => d.estado !== 'pagada');
    }

    // Si estamos en Cuentas Hoy, mostramos mesas vivas y deudas de hoy
    const mesasComoDeudas = this.mesasActivas().map(m => ({
      id: 'mesa-' + m.id,
      name: m.jugadores?.[0]?.split(' ')[0] || 'Jugador',
      lastName: '',
      descripcion: `Juego en Curso: ${m.code} (${m.gameType})`,
      estado: 'en_juego',
      monto: m.total || 0,
      montoPagado: 0,
      notas: `Mesa activa. Consumos: $${m.totalConsumos || 0} | Tiempo: $${m.costoTiempo || 0}`,
      fechaCreacion: m.tiempoInicio,
      isLive: true
    }));

    const deudasReales = this.deudas().filter(d => d.estado !== 'pagada');
    
    return [...mesasComoDeudas, ...deudasReales];
  });

  cuentasPagadas = computed(() => {
    // Para Cuentas Hoy o Deudas Historial, simplemente filtramos las pagadas de la lista de deudas cargada
    // (ya que loadDeudas ya filtra por hoy o global desde la API!)
    return this.deudas().filter(d => d.estado === 'pagada');
  });

  form = this.fb.group({
    // Campos para usuario registrado
    userId:          [null],
    // Campos para cliente externo
    nombreCliente:   [''],
    telefonoCliente: [''],
    // Campos comunes
    descripcion:     ['', Validators.required],
    monto:           [0, [Validators.required, Validators.min(1)]],
    notas:           [''],
  });

  pagoForm = this.fb.group({
    montoPago: [0, [Validators.required, Validators.min(1)]],
    metodoPago: ['efectivo', Validators.required],
  });

  pollId: any;

  get cambioACambiar() {
    if (!this.deudaSeleccionada()) return 0;
    const recibido = this.pagoForm.get('montoPago')?.value || 0;
    const pendiente = this.getPendiente(this.deudaSeleccionada());
    return Math.max(0, recibido - pendiente);
  }

  ngOnInit() {
    this.http.get<any[]>(`${API}/users/names`).subscribe({ next: u => this.usuarios.set(u), error: () => {} });
    
    this.verificarTurnoActivo();
    this.cargarTodo();
    
    // Tick local
    this.intervalId = setInterval(() => {
      this.tickMesas();
    }, 1000);
    
    // Polling remoto
    this.pollId = setInterval(() => {
      this.verificarTurnoActivo();
      this.cargarTodo();
    }, 8000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.pollId) clearInterval(this.pollId);
  }

  verificarTurnoActivo() {
    this.http.get<any>(`${API}/operaciones/turno/activo`).subscribe({
      next: (t) => {
        this.turnoActivo.set(!!t);
      },
      error: () => this.turnoActivo.set(false)
    });
  }

  cargarTodo() {
    this.loadDeudas();
    // Solo cargar mesas si es Cuentas Hoy
    if (this.esCuentas()) {
      this.cargarMesasVivas();
    } else {
      this.mesasActivas.set([]);
    }
  }

  cargarMesasVivas() {
    this.http.get<any[]>(`${API}/recursos/todas`).subscribe(todas => {
       const mesasOcupadas = todas.filter(m => m.status === 'occupied');
       if(mesasOcupadas.length === 0) {
         this.mesasActivas.set([]);
         return;
       }
       
       this.http.get<any[]>(`${API}/pedidos/activos`).subscribe(pedidos => {
          const mesasConDatos = mesasOcupadas.map(m => {
             const pedidosMesa = pedidos.filter(p => p.recursoId === m.id && p.estado !== 'entregado');
             const consumos = pedidosMesa.reduce((acc, p) => acc + parseFloat(p.total), 0);
             return {
               ...m,
               totalConsumos: consumos,
               costoTiempo: 0,
               total: consumos
             };
          });
          this.mesasActivas.set(mesasConDatos);
          this.tickMesas();
       });
    });
  }

  tickMesas() {
    if (!this.esCuentas() || this.mesasActivas().length === 0) return;
    this.mesasActivas.update(mesas => mesas.map(m => {
      const diffMs = Date.now() - new Date(m.tiempoInicio).getTime();
      const horas = diffMs / (1000 * 3600);
      const costoTiempo = Math.round(horas * m.pricePerHour);
      return { ...m, costoTiempo, total: m.totalConsumos + costoTiempo };
    }));
  }

  loadDeudas() {
    const endpoint = this.esCuentas() ? `${API}/deudas/hoy` : `${API}/deudas`;
    this.http.get<any[]>(endpoint).subscribe({
      next: d => this.deudas.set(d),
      error: () => {}
    });
  }

  setModo(modo: 'registrado' | 'externo') {
    this.modoCliente.set(modo);
    if (modo === 'registrado') {
      this.form.patchValue({ nombreCliente: '', telefonoCliente: '' });
    } else {
      this.form.patchValue({ userId: null });
    }
  }

  get totalPendiente() {
    return this.cuentasActivas().reduce((a, d) => a + (parseFloat(d.monto) - parseFloat(d.montoPagado)), 0);
  }

  getNombreCliente(d: any): string {
    if (d.esExterno || !d.name) return d.nombreCliente || 'Visitante';
    const lastName = d.lastName || '';
    return `${d.name} ${lastName}`.trim();
  }

  openPago(d: any) {
    this.deudaSeleccionada.set(d);
    this.pagoForm.reset({ montoPago: parseFloat(d.monto) - parseFloat(d.montoPagado), metodoPago: 'efectivo' });
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

  openPasarHistorial(d: any) {
    this.deudaParaPasarHistorial.set(d);
    this.showConfirmarPasarHistorial.set(true);
  }

  confirmarPasarHistorial() {
    const d = this.deudaParaPasarHistorial();
    if (!d) return;
    this.loading.set(true);
    this.http.post(`${API}/deudas/${d.id}/pasar-historial`, {}).subscribe({
      next: () => {
        this.loadDeudas();
        this.showConfirmarPasarHistorial.set(false);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openModal() {
    this.form.reset({ monto: 0 });
    this.modoCliente.set('registrado');
    this.errorMsg.set('');
    this.showModal.set(true);
  }

  save() {
    this.errorMsg.set('');
    const val = this.form.value;
    const esExterno = this.modoCliente() === 'externo';

    if (!esExterno && !val.userId) {
      this.errorMsg.set('Selecciona un cliente registrado.');
      return;
    }
    if (esExterno && !val.nombreCliente?.trim()) {
      this.errorMsg.set('Ingresa el nombre del visitante.');
      return;
    }
    if (!val.descripcion?.trim()) {
      this.errorMsg.set('La descripción es requerida.');
      return;
    }
    if (!val.monto || Number(val.monto) <= 0) {
      this.errorMsg.set('El monto debe ser mayor a 0.');
      return;
    }

    this.loading.set(true);
    const payload: any = {
      descripcion: val.descripcion,
      monto:       Number(val.monto),
      notas:       val.notas || null,
    };

    if (esExterno) {
      payload.nombreCliente   = val.nombreCliente?.trim();
      payload.telefonoCliente = val.telefonoCliente?.trim() || null;
      payload.esExterno       = true;
    } else {
      payload.userId = Number(val.userId);
    }

    this.http.post(`${API}/deudas`, payload).subscribe({
      next: () => {
        this.loadDeudas();
        this.showModal.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message;
        this.errorMsg.set(Array.isArray(msg) ? msg[0] : msg || 'Error al registrar deuda');
      }
    });
  }

  getEstadoColor(estado: string) {
    return { pendiente: '#f87171', parcial: '#f59e0b', en_juego: '#3b82f6' }[estado] ?? '#64748b';
  }

  getPendiente(d: any) { return parseFloat(d.monto) - parseFloat(d.montoPagado); }
}
