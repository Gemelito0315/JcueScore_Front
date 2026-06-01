import { Component, signal, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MesasService, MesaActiva } from '../../../core/services/mesas.service';
import { GeoService } from '../../../core/services/geo.service';

@Component({
  selector: 'app-usuario-disponibilidad',
  imports: [CommonModule, RouterLink],
  templateUrl: './disponibilidad.html',
  styleUrl: './disponibilidad.scss'
})
export class UsuarioDisponibilidad implements OnInit {
  private mesasService = inject(MesasService);
  public geoService = inject(GeoService);

  filtro = signal('todos');
  loading = signal(true);
  
  // Señal local para almacenar los datos
  recursos = signal<MesaActiva[]>([]);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.mesasService.obtenerMesasActivas().subscribe({
      next: (data) => {
        console.log('Mesas activas:', data);
        this.recursos.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando disponibilidad:', err);
        this.errorMessage.set(err.message || 'Error desconocido');
        this.loading.set(false);
      }
    });
  }

  get filtrados() {
    const f = this.filtro();
    const all = this.recursos();
    if (!all) return [];
    if (f === 'todos') return all;
    return all.filter(r => (r.gameType?.toLowerCase() || 'billar') === f);
  }

  get libres()     { return this.recursos().filter(r => r.status === 'available').length; }
  get ocupadas()   { return this.recursos().filter(r => r.status === 'occupied').length; }
  get enMant()     { return this.recursos().filter(r => r.status === 'maintenance').length; }

  getIcon(tipo: string) {
    return ({ Billar: '🎱', Tejo: '🎯', Bolirama: '🎳' } as any)[tipo || 'Billar'] ?? '🎮';
  }

  getEstadoClass(estado: string) {
    return ({ available: 'libre', occupied: 'ocupada', maintenance: 'mant' } as any)[estado] ?? '';
  }

  getEstadoLabel(estado: string) {
    return ({ available: 'Libre', occupied: 'Ocupada', maintenance: 'Mantenimiento' } as any)[estado] ?? estado;
  }

  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);
  }
}
