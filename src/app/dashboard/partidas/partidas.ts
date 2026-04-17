import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
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
}

@Component({
  selector: 'app-partidas',
  imports: [CommonModule],
  templateUrl: './partidas.html',
  styleUrl: './partidas.scss'
})
export class Partidas implements OnInit, OnDestroy {
  private router = inject(Router);
  private mesasService = inject(MesasService);

  mesas = this.mesasService.mesasActivas;
  tiempos = this.mesasService.tiempos;
  ingresos = this.mesasService.ingresos;

  ngOnInit() {
    // El servicio ya maneja la actualización en tiempo real
  }

  ngOnDestroy() {
    // El servicio maneja su propio cleanup
  }

  get mesasOcupadas() { return this.mesasService.mesasOcupadas; }
  get mesasLibres() { return this.mesasService.mesasLibres; }
  get ingresoEstimado() { return this.mesasService.ingresoEstimado; }

  abrirMesa(mesa: MesaActiva) {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/mesa', mesa.code]));
    window.open(url, '_blank');
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
