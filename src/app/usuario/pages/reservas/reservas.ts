import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../auth/services/auth';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-usuario-reservas',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reservas.html',
  styleUrl: './reservas.scss'
})
export class UsuarioReservas implements OnInit {
  private http   = inject(HttpClient);
  private auth   = inject(Auth);
  private fb     = inject(FormBuilder);

  showForm   = signal(false);
  loading    = signal(false);
  saving     = signal(false);
  reservas   = signal<any[]>([]);
  recursos   = signal<any[]>([]);

  form = this.fb.group({
    recursoId:   [null as number | null, Validators.required],
    fecha:       ['', Validators.required],
    horaInicio:  ['', Validators.required],
    horaFin:     ['', Validators.required],
    notas:       [''],
  });

  ngOnInit() {
    this.cargarReservas();
    this.cargarRecursos();
  }

  cargarReservas() {
    this.loading.set(true);
    const userId = this.auth.currentUser()?.id;
    const url = userId ? `${API}/reservas?userId=${userId}` : `${API}/reservas`;
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.reservas.set(data.map(r => ({
          id: r.id,
          tipo: r.recurso?.gameType?.name ?? r.recurso?.code ?? 'Billar',
          mesa: r.recurso?.code ?? 'Mesa',
          fecha: r.fecha?.split('T')[0] ?? r.fecha,
          hora: `${r.horaInicio ?? ''} - ${r.horaFin ?? ''}`,
          estado: r.estado ?? 'confirmada',
          notas: r.notas ?? ''
        })));
        this.loading.set(false);
      },
      error: () => {
        this.reservas.set([]);
        this.loading.set(false);
      }
    });
  }

  cargarRecursos() {
    this.http.get<any[]>(`${API}/recursos`).subscribe({
      next: (data) => this.recursos.set(data.filter(r => r.status === 'available' || r.isActive)),
      error: () => this.recursos.set([])
    });
  }

  getEstadoClass(estado: string) {
    return ({ confirmada: 'badge-cyan', completada: 'badge-green', cancelada: 'badge-red', pendiente: 'badge-orange' } as any)[estado] ?? 'badge-gray';
  }

  cancelar(id: number) {
    if (!confirm('¿Cancelar esta reserva?')) return;
    this.http.put(`${API}/reservas/${id}`, { estado: 'cancelada' }).subscribe({
      next: () => this.cargarReservas(),
      error: () => this.reservas.update(rs => rs.map(r => r.id === id ? { ...r, estado: 'cancelada' } : r))
    });
  }

  guardar() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;
    const userId = this.auth.currentUser()?.id;
    const payload = {
      userId,
      recursoId: Number(v.recursoId),
      fecha: v.fecha,
      horaInicio: v.horaInicio,
      horaFin: v.horaFin,
      notas: v.notas,
      estado: 'confirmada'
    };
    this.http.post(`${API}/reservas`, payload).subscribe({
      next: () => {
        this.showForm.set(false);
        this.form.reset();
        this.saving.set(false);
        this.cargarReservas();
      },
      error: () => {
        // fallback local si el backend falla
        const recurso = this.recursos().find(r => r.id === Number(v.recursoId));
        this.reservas.update(rs => [...rs, {
          id: Date.now(),
          tipo: recurso?.gameType?.name ?? 'Billar',
          mesa: recurso?.code ?? 'Mesa asignada',
          fecha: v.fecha ?? '',
          hora: `${v.horaInicio} - ${v.horaFin}`,
          estado: 'confirmada',
          notas: v.notas ?? ''
        }]);
        this.showForm.set(false);
        this.form.reset();
        this.saving.set(false);
      }
    });
  }

  get hoy() { return new Date().toISOString().split('T')[0]; }
}
