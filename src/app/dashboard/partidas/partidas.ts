import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MesasService } from '../../core/services/mesas.service';

interface MesaActiva {
  id: number;
  code: string;
  gameType: string;
  status: string;
  pricePerHour: number;
  tiempoInicio?: Date;
  jugadores?: string[];
  marcador?: { j1: number; j2: number };
  partidaId?: number;
}

@Component({
  selector: 'app-partidas',
  imports: [CommonModule, FormsModule],
  templateUrl: './partidas.html',
  styleUrl: './partidas.scss'
})
export class Partidas implements OnInit, OnDestroy {
  private router = inject(Router);
  private mesasService = inject(MesasService);
  private http = inject(HttpClient);

  mesas = this.mesasService.mesasActivas;
  tiempos = this.mesasService.tiempos;
  ingresos = this.mesasService.ingresos;

  // Estados de modales interactivos
  mostrarModalIniciar = signal(false);
  mostrarModalFinalizar = signal(false);
  mesaSeleccionada = signal<MesaActiva | null>(null);

  usuarios = signal<any[]>([]);

  // Campos para iniciar juego
  jugador1Id: number | null = null;
  jugador2Id: number | null = null;

  // Campos para finalizar juego
  marcadorJ1 = 0;
  marcadorJ2 = 0;

  ngOnInit() {
    this.http.get<any[]>('http://localhost:3000/users/names').subscribe({
      next: (users) => this.usuarios.set(users)
    });
  }

  ngOnDestroy() {
    // El servicio maneja su propio cleanup
  }

  get mesasOcupadas() { return this.mesasService.mesasOcupadas; }
  get mesasLibres() { return this.mesasService.mesasLibres; }
  get ingresoEstimado() { return this.mesasService.ingresoEstimado; }

  abrirMesa(mesa: MesaActiva) {
    const queryParams = { queryParams: { mode: 'viewer' } };
    const url = this.router.serializeUrl(this.router.createUrlTree(['/mesa', mesa.code], queryParams));
    window.open(url, '_blank');
  }

  abrirModalIniciar(mesa: MesaActiva) {
    this.mesaSeleccionada.set(mesa);
    this.jugador1Id = null;
    this.jugador2Id = null;
    this.mostrarModalIniciar.set(true);
  }

  abrirModalFinalizar(mesa: MesaActiva) {
    this.mesaSeleccionada.set(mesa);
    this.marcadorJ1 = 0;
    this.marcadorJ2 = 0;
    this.mostrarModalFinalizar.set(true);
  }

  confirmarIniciarPartida() {
    const mesa = this.mesaSeleccionada();
    if (!mesa || !this.jugador1Id) return;

    const u1 = this.usuarios().find(u => Number(u.id) === Number(this.jugador1Id));
    if (!u1) return;
    const name1 = `${u1.name} ${u1.lastName || ''}`.trim();
    
    const jugadores = [name1];
    
    if (this.jugador2Id) {
      const u2 = this.usuarios().find(u => Number(u.id) === Number(this.jugador2Id));
      if (u2) jugadores.push(`${u2.name} ${u2.lastName || ''}`.trim());
    }

    this.mesasService.iniciarPartida(mesa.id, jugadores).subscribe({
      next: () => {
        this.mostrarModalIniciar.set(false);
        this.mesaSeleccionada.set(null);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al iniciar la partida. Verifica que el Jugador 1 esté registrado.');
      }
    });
  }

  confirmarFinalizarPartida() {
    const mesa = this.mesaSeleccionada();
    if (!mesa || !mesa.partidaId) return;

    const marcador = {
      j1: this.marcadorJ1,
      j2: this.marcadorJ2
    };

    this.mesasService.finalizarPartida(mesa.partidaId, marcador).subscribe({
      next: () => {
        this.mostrarModalFinalizar.set(false);
        this.mesaSeleccionada.set(null);
      },
      error: (err) => {
        alert(err.error?.message || 'Error al finalizar la partida.');
      }
    });
  }

  calcularIngreso(mesa: MesaActiva): number {
    if (!mesa.tiempoInicio) return 0;
    const horas = (Date.now() - mesa.tiempoInicio.getTime()) / 3600000;
    return mesa.pricePerHour * horas;
  }

  getStatusColor(status: string) {
    return { occupied: '#f59e0b', available: '#34d399', maintenance: '#f87171' }[status] ?? '#64748b';
  }

  getStatusLabel(status: string) {
    return { occupied: 'En juego', available: 'Disponible', maintenance: 'Mantenimiento' }[status] ?? status;
  }

  getGameIcon(type: string) {
    return { Billar: '🎱', 'Tres Bandas': '🎯', Tejo: '🎯', Bolirama: '🎳' }[type] ?? '🎮';
  }
}
