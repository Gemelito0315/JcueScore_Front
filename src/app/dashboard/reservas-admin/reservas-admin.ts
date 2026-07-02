import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-reservas-admin',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reservas-admin.html',
  styleUrl: './reservas-admin.scss'
})
export class ReservasAdmin implements OnInit {
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  filtroEstado = signal('todas');
  filtroFecha  = signal(
    (() => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().split('T')[0];
    })()
  );
  loading      = signal(false);
  saving       = signal(false);
  showModal    = signal(false);
  reservas     = signal<any[]>([]);
  recursos     = signal<any[]>([]);
  usuarios     = signal<any[]>([]);
  config       = signal<any>(null);

  form = this.fb.group({
    clienteTipo: ['registrado'],
    userId:     [null as number | null],
    guestName:  [''],
    recursoId:  [null as number | null, Validators.required],
    fecha:      ['', Validators.required],
    horaInicio: ['', Validators.required],
    horaFin:    ['', Validators.required],
    notas:      [''],
  });

  ngOnInit() {
    this.cargarReservas();
    this.http.get<any[]>(`${API}/recursos`).subscribe({ next: d => this.recursos.set(d), error: () => {} });
    // Load system users instead of customers, as requested
    this.http.get<any[]>(`${API}/users`).subscribe({ next: d => this.usuarios.set(d), error: () => {} });
    this.http.get<any>(`${API}/configuracion`).subscribe({ next: d => this.config.set(d), error: () => {} });
  }

  cargarReservas() {
    this.loading.set(true);
    this.http.get<any[]>(`${API}/reservas`).subscribe({
      next: (data) => {
        this.reservas.set(data.map(r => ({
          id: r.id,
          cliente: r.guestName ? `${r.guestName} (Invitado)` : r.customer
            ? `${r.customer.name ?? ''} ${r.customer.lastName ?? ''}`.trim()
            : r.user ? `${r.user?.name ?? ''} ${r.user?.lastName ?? ''}`.trim() : 'Cliente',
          mesa: r.resource?.code ?? r.recurso?.code ?? 'Mesa',
          tipo: r.resource?.gameType?.name ?? r.recurso?.gameType?.name ?? 'Billar',
          fecha: (r.reservationDate ?? r.fecha)?.split('T')[0] ?? '',
          hora: `${r.startTime ?? r.horaInicio ?? ''} - ${r.endTime ?? r.horaFin ?? ''}`,
          estado: ({ pending: 'pendiente', confirmed: 'confirmada', completed: 'completada', cancelled: 'cancelada' } as any)[r.status] ?? r.status ?? r.estado ?? 'pendiente',
          monto: r.totalAmount ?? r.monto ?? 0,
          notas: r.notes ?? r.notas ?? '',
          raw: r
        })));
        this.loading.set(false);
      },
      error: () => {
        // fallback demo
        this.reservas.set([
          { id: 1, cliente: 'Carlos Rodríguez', mesa: 'Mesa 1', tipo: 'Billar', fecha: new Date().toISOString().split('T')[0], hora: '14:00 - 16:00', estado: 'confirmada', monto: 30000 },
          { id: 2, cliente: 'Andrés Martínez',  mesa: 'Mesa 3', tipo: 'Tres Bandas', fecha: new Date().toISOString().split('T')[0], hora: '16:00 - 18:00', estado: 'pendiente', monto: 40000 },
          { id: 3, cliente: 'Luis Pérez',        mesa: 'Chancha 1', tipo: 'Tejo', fecha: new Date().toISOString().split('T')[0], hora: '18:00 - 19:00', estado: 'confirmada', monto: 12000 },
        ]);
        this.loading.set(false);
      }
    });
  }

  get reservasFiltradas() {
    return this.reservas().filter(r => {
      const estadoOk = this.filtroEstado() === 'todas' || r.estado === this.filtroEstado();
      return estadoOk;
    });
  }

  get totalHoy() {
    return this.reservas().filter(r => r.fecha === this.filtroFecha() && r.estado !== 'cancelada').length;
  }
  get ingresoHoy() {
    return this.reservas().filter(r => r.fecha === this.filtroFecha() && r.estado === 'completada').reduce((a, r) => a + (r.monto ?? 0), 0);
  }
  get pendientesHoy() {
    return this.reservas().filter(r => r.fecha === this.filtroFecha() && r.estado === 'pendiente').length;
  }

  confirmar(id: number) {
    this.http.put(`${API}/reservas/${id}`, { status: 'confirmed', estado: 'confirmada' }).subscribe({
      next: () => this.cargarReservas(),
      error: () => this.reservas.update(rs => rs.map(r => r.id === id ? { ...r, estado: 'confirmada' } : r))
    });
  }

  completar(id: number) {
    this.http.put(`${API}/reservas/${id}`, { status: 'completed', estado: 'completada' }).subscribe({
      next: () => this.cargarReservas(),
      error: () => this.reservas.update(rs => rs.map(r => r.id === id ? { ...r, estado: 'completada' } : r))
    });
  }

  cancelar(id: number) {
    if (!confirm('¿Cancelar esta reserva?')) return;
    this.http.put(`${API}/reservas/${id}`, { status: 'cancelled', estado: 'cancelada' }).subscribe({
      next: () => this.cargarReservas(),
      error: () => this.reservas.update(rs => rs.map(r => r.id === id ? { ...r, estado: 'cancelada' } : r))
    });
  }

  eliminar(id: number) {
    if (!confirm('¿Eliminar esta reserva por completo del sistema? Esta acción no se puede deshacer.')) return;
    this.http.delete(`${API}/reservas/${id}`).subscribe({
      next: () => this.cargarReservas(),
      error: (err) => alert(err.error?.message || 'Error al eliminar')
    });
  }

  openCreate() {
    this.form.reset({ notas: '' });
    this.showModal.set(true);
  }

  save() {
    if (this.form.invalid) return;
    
    const v = this.form.value;
    
    // Validaciones lógicas de fecha y hora
    // Para que new Date() use la zona horaria local correctamente al instanciar fecha+hora
    const [year, month, day] = v.fecha.split('-').map(Number);
    const [hours, minutes] = v.horaInicio.split(':').map(Number);
    const resDateTime = new Date(year, month - 1, day, hours, minutes);
    if (resDateTime < new Date()) {
      alert("⚠️ No puedes agendar una reserva en el pasado.");
      return;
    }
    if (v.horaFin && v.horaInicio && v.horaFin <= v.horaInicio) {
      alert("⚠️ La hora de fin debe ser posterior a la hora de inicio.");
      return;
    }

    const openNorm = this.config()?.horarioApertura || '08:00';
    const closeNorm = this.config()?.horarioCierre || '22:00';

    if (v.horaInicio && (v.horaInicio < openNorm || v.horaInicio > closeNorm)) {
      alert(`⚠️ La hora de inicio debe estar dentro del horario de atención (${openNorm} - ${closeNorm}).`);
      return;
    }
    if (v.horaFin && (v.horaFin < openNorm || v.horaFin > closeNorm)) {
      alert(`⚠️ La hora de fin debe estar dentro del horario de atención (${openNorm} - ${closeNorm}).`);
      return;
    }

    // Validaciones de cliente o invitado
    if (v.clienteTipo === 'registrado' && !v.userId) {
      alert("⚠️ Selecciona un cliente registrado.");
      return;
    }
    if (v.clienteTipo === 'invitado' && !v.guestName?.trim()) {
      alert("⚠️ Ingresa el nombre del invitado.");
      return;
    }

    this.saving.set(true);
    this.http.post(`${API}/reservas`, {
      userId: v.clienteTipo === 'registrado' ? Number(v.userId) : null,
      customerId: null,
      guestName: v.clienteTipo === 'invitado' ? v.guestName : null,
      resourceId: Number(v.recursoId),
      venueId: 1,
      reservationDate: v.fecha,
      startTime: v.horaInicio,
      endTime: v.horaFin,
      notes: v.notas,
      totalAmount: 0,
      status: 'confirmed'
    }).subscribe({
      next: () => { this.showModal.set(false); this.saving.set(false); this.cargarReservas(); },
      error: (err) => { alert(err.error?.message || "Error al crear la reserva"); this.saving.set(false); }
    });
  }

  getEstadoColor(estado: string) {
    return ({ confirmada: '#34d399', pendiente: '#f59e0b', completada: '#06b6d4', cancelada: '#f87171' } as any)[estado] ?? '#64748b';
  }
  getGameIcon(tipo: string) {
    return ({ Billar: '🎱', 'Tres Bandas': '🎯', Tejo: '🎯', Bolirama: '🎳' } as any)[tipo] ?? '🎮';
  }
  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  }
  get hoy() { 
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0]; 
  }
}
