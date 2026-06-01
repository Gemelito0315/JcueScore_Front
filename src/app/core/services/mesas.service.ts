import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, startWith } from 'rxjs';
import { WebsocketsService } from './websockets.service';

export interface Mesa {
  id: number;
  code: string;
  gameType: string;
  status: 'available' | 'occupied' | 'maintenance';
  pricePerHour: number;
  resourceId: number;
  venueId: number;
}

export interface MesaActiva extends Mesa {
  tiempoInicio?: Date;
  jugadores?: string[];
  marcador?: { j1: number; j2: number };
  partidaId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MesasService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);
  private websocketsService = inject(WebsocketsService);

  mesasActivas = signal<MesaActiva[]>([]);
  tiempos = signal<Record<number, string>>({});
  ingresos = signal<Record<number, number>>({});

  constructor() {
    this.cargarMesasIniciales();
    this.iniciarActualizacionTiempos();
    this.iniciarEscuchaSockets();
  }

  private cargarMesasIniciales() {
    this.obtenerMesasActivas().subscribe(mesas => {
      const mapeadas = mesas.map(m => ({
        ...m,
        tiempoInicio: m.tiempoInicio ? new Date(m.tiempoInicio) : undefined
      }));
      this.mesasActivas.set(mapeadas);
      this.actualizarTiempos();
    });
  }

  private iniciarActualizacionTiempos() {
    // Actualizar el cronómetro local de las mesas activas cada segundo, sin consultas al servidor.
    interval(1000).subscribe(() => {
      this.actualizarTiempos();
    });
  }

  private iniciarEscuchaSockets() {
    this.websocketsService.onPartidaActualizada().subscribe(data => {
      const actuales = this.mesasActivas();
      const index = actuales.findIndex(m => m.id === data.mesaId);
      if (index >= 0) {
        actuales[index] = {
          ...actuales[index],
          status: data.estado === 'en_juego' ? 'occupied' : 'available',
          tiempoInicio: data.tiempoInicio ? new Date(data.tiempoInicio) : undefined,
          jugadores: data.jugadores || [],
          marcador: data.marcador || undefined,
          partidaId: data.partidaId || undefined
        };
        this.mesasActivas.set([...actuales]);
        this.actualizarTiempos();
      }
    });
  }

  obtenerMesasActivas(): Observable<MesaActiva[]> {
    return this.http.get<MesaActiva[]>(`${this.API_URL}/recursos/activas`);
  }

  iniciarPartida(mesaId: number, jugadores: string[]): Observable<any> {
    return this.http.post(`${this.API_URL}/partidas/iniciar`, {
      resourceId: mesaId,
      jugadores,
      startTime: new Date().toISOString()
    });
  }

  finalizarPartida(partidaId: number, marcador: { j1: number; j2: number }): Observable<any> {
    return this.http.put(`${this.API_URL}/partidas/finalizar`, {
      partidaId,
      marcador,
      endTime: new Date().toISOString()
    });
  }

  actualizarTiempos() {
    const t: Record<number, string> = {};
    const ing: Record<number, number> = {};
    
    this.mesasActivas().forEach(m => {
      if (m.tiempoInicio) {
        const diff = Math.floor((Date.now() - m.tiempoInicio.getTime()) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const min = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        t[m.id] = `${h}:${min}:${s}`;
        ing[m.id] = Math.round((diff / 3600) * m.pricePerHour);
      }
    });
    
    this.tiempos.set({ ...t });
    this.ingresos.set({ ...ing });
  }

  get mesasOcupadas() { 
    return this.mesasActivas().filter(m => m.status === 'occupied').length; 
  }
  
  get mesasLibres() { 
    return this.mesasActivas().filter(m => m.status === 'available').length; 
  }
  
  get ingresoEstimado() {
    return this.mesasActivas()
      .filter(m => m.status === 'occupied' && m.tiempoInicio)
      .reduce((acc, m) => {
        const horas = (Date.now() - m.tiempoInicio!.getTime()) / 3600000;
        return acc + (m.pricePerHour * horas);
      }, 0);
  }
}
