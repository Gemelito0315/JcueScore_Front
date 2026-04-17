import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reservas-admin',
  imports: [CommonModule],
  templateUrl: './reservas-admin.html',
  styleUrl: './reservas-admin.scss'
})
export class ReservasAdmin {
  filtroEstado = signal('todas');
  filtroFecha = signal(new Date().toISOString().split('T')[0]);

  reservas = signal([
    { id: 1, cliente: 'Carlos Rodríguez', mesa: 'Mesa 1', tipo: 'Billar', fecha: '2026-04-10', hora: '14:00 - 16:00', estado: 'confirmada', monto: 30000 },
    { id: 2, cliente: 'Andrés Martínez', mesa: 'Mesa 3', tipo: 'Tres Bandas', fecha: '2026-04-10', hora: '16:00 - 18:00', estado: 'pendiente', monto: 40000 },
    { id: 3, cliente: 'Luis Pérez', mesa: 'Chancha 1', tipo: 'Tejo', fecha: '2026-04-10', hora: '18:00 - 19:00', estado: 'confirmada', monto: 12000 },
    { id: 4, cliente: 'Juan Castro', mesa: 'Mesa 2', tipo: 'Billar', fecha: '2026-04-11', hora: '10:00 - 12:00', estado: 'pendiente', monto: 30000 },
    { id: 5, cliente: 'Pedro Vargas', mesa: 'Máquina 1', tipo: 'Bolirama', fecha: '2026-04-09', hora: '20:00 - 21:00', estado: 'completada', monto: 10000 },
    { id: 6, cliente: 'Carlos Rodríguez', mesa: 'Mesa 1', tipo: 'Billar', fecha: '2026-04-09', hora: '15:00 - 17:00', estado: 'cancelada', monto: 30000 },
  ]);

  get reservasFiltradas() {
    return this.reservas().filter(r => {
      const estadoOk = this.filtroEstado() === 'todas' || r.estado === this.filtroEstado();
      return estadoOk;
    });
  }

  get totalHoy() { return this.reservas().filter(r => r.fecha === this.filtroFecha() && r.estado !== 'cancelada').length; }
  get ingresoHoy() { return this.reservas().filter(r => r.fecha === this.filtroFecha() && r.estado === 'completada').reduce((a, r) => a + r.monto, 0); }

  confirmar(id: number) {
    this.reservas.update(rs => rs.map(r => r.id === id ? { ...r, estado: 'confirmada' } : r));
  }

  cancelar(id: number) {
    if (!confirm('¿Cancelar esta reserva?')) return;
    this.reservas.update(rs => rs.map(r => r.id === id ? { ...r, estado: 'cancelada' } : r));
  }

  getEstadoColor(estado: string) {
    return { confirmada: '#34d399', pendiente: '#f59e0b', completada: '#06b6d4', cancelada: '#f87171' }[estado] ?? '#64748b';
  }

  getGameIcon(tipo: string) {
    return { Billar: '🎱', 'Tres Bandas': '🎯', Tejo: '🎯', Bolirama: '🎳' }[tipo] ?? '🎮';
  }
}
