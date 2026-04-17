import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Torneo {
  id: number;
  nombre: string;
  descripcion?: string;
  formato: 'round_robin' | 'eliminacion_directa' | 'doble_eliminacion' | 'suizo';
  estado: 'inscripcion' | 'en_curso' | 'finalizado' | 'cancelado';
  minJugadores: number;
  maxJugadores: number;
  premioTotal: number;
  costoInscripcion: number;
  fechaInicio?: Date;
  fechaFin?: Date;
  fechaLimiteInscripcion?: Date;
  inscripciones?: InscripcionTorneo[];
  partidos?: PartidoTorneo[];
}

export interface InscripcionTorneo {
  id: number;
  torneoId: number;
  jugadorId: number;
  jugador: {
    id: number;
    name: string;
    eloRating: number;
    club?: string;
  };
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'eliminada';
  handicap: number;
  pagoInscripcion?: number;
  fechaPago?: Date;
  estadisticasTorneo?: {
    partidosJugados?: number;
    partidosGanados?: number;
    partidosPerdidos?: number;
    puntos?: number;
    promedioGeneral?: number;
  };
}

export interface PartidoTorneo {
  id: number;
  torneoId: number;
  jugador1Id?: number;
  jugador2Id?: number;
  jugador1?: {
    id: number;
    name: string;
    eloRating: number;
  };
  jugador2?: {
    id: number;
    name: string;
    eloRating: number;
  };
  jugador1Score?: number;
  jugador2Score?: number;
  jugador1Innings?: number;
  jugador2Innings?: number;
  estado: 'pendiente' | 'en_juego' | 'finalizado' | 'cancelado';
  fase: 'grupos' | 'octavos' | 'cuartos' | 'semifinales' | 'final' | 'tercer_puesto';
  numeroRonda?: number;
  numeroGrupo?: number;
  fechaProgramada?: Date;
  fechaInicio?: Date;
  fechaFin?: Date;
  estadisticas?: {
    duracionMinutos?: number;
    promedioJugador1?: number;
    promedioJugador2?: number;
    mejorRacha?: number;
  };
  mesaAsignada?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TorneosService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);

  torneosActivos = signal<Torneo[]>([]);
  torneoSeleccionado = signal<Torneo | null>(null);

  obtenerTorneosActivos(): Observable<Torneo[]> {
    return this.http.get<Torneo[]>(`${this.API_URL}/torneos/activos`);
  }

  obtenerTorneo(id: number): Observable<Torneo> {
    return this.http.get<Torneo>(`${this.API_URL}/torneos/${id}`);
  }

  obtenerInscripciones(torneoId: number): Observable<InscripcionTorneo[]> {
    return this.http.get<InscripcionTorneo[]>(`${this.API_URL}/torneos/${torneoId}/inscripciones`);
  }

  obtenerPartidos(torneoId: number): Observable<PartidoTorneo[]> {
    return this.http.get<PartidoTorneo[]>(`${this.API_URL}/torneos/${torneoId}/partidos`);
  }

  inscribirJugador(torneoId: number, jugadorId: number, handicap?: number): Observable<any> {
    return this.http.post(`${this.API_URL}/torneos/${torneoId}/inscribir`, {
      jugadorId,
      handicap: handicap || 30
    });
  }

  generarPartidos(torneoId: number): Observable<any> {
    return this.http.post(`${this.API_URL}/torneos/${torneoId}/generar-partidos`, {});
  }

  registrarResultado(partidoId: number, resultado: {
    jugador1Score: number;
    jugador2Score: number;
    jugador1Innings: number;
    jugador2Innings: number;
  }): Observable<any> {
    return this.http.put(`${this.API_URL}/torneos/partidos/${partidoId}/resultado`, resultado);
  }

  crearTorneo(torneo: Partial<Torneo>): Observable<Torneo> {
    return this.http.post<Torneo>(`${this.API_URL}/torneos`, torneo);
  }

  actualizarTorneo(id: number, torneo: Partial<Torneo>): Observable<Torneo> {
    return this.http.put<Torneo>(`${this.API_URL}/torneos/${id}`, torneo);
  }

  eliminarTorneo(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/torneos/${id}`);
  }

  // Métodos utilitarios
  getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
      'inscripcion': 'Inscripción Abierta',
      'en_curso': 'En Curso',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado',
      'pendiente': 'Pendiente',
      'confirmada': 'Confirmada',
      'en_juego': 'En Juego'
    };
    return labels[estado] || estado;
  }

  getFormatoLabel(formato: string): string {
    const labels: Record<string, string> = {
      'round_robin': 'Round Robin',
      'eliminacion_directa': 'Eliminación Directa',
      'doble_eliminacion': 'Doble Eliminación',
      'suizo': 'Sistema Suizo'
    };
    return labels[formato] || formato;
  }

  getFaseLabel(fase: string): string {
    const labels: Record<string, string> = {
      'grupos': 'Fase de Grupos',
      'octavos': 'Octavos de Final',
      'cuartos': 'Cuartos de Final',
      'semifinales': 'Semifinales',
      'final': 'Gran Final',
      'tercer_puesto': 'Tercer Puesto'
    };
    return labels[fase] || fase;
  }
}
