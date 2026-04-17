import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BalanceLealtad {
  usuarioId: number;
  jcueCoins: number;
  totalMinado: number;
  nivel: string;
  proximoNivel: {
    nombre: string;
    coinsRequeridos: number;
    coinsActuales: number;
  };
}

export interface TransaccionLealtad {
  id: number;
  usuarioId: number;
  clubId?: number;
  tipo: 'mining' | 'ganancia_partida' | 'participacion_partida' | 'ganancia_torneo' | 'inscripcion_torneo' | 'compra_producto' | 'canje_recompensa' | 'bono_admin' | 'ajuste_sistema';
  fuente: 'gps_checkin' | 'partida_finalizada' | 'torneo_finalizado' | 'sistema' | 'admin';
  cantidad: number;
  saldoAnterior: number;
  saldoNuevo: number;
  metadata?: {
    partidaId?: number;
    torneoId?: number;
    productoId?: number;
    duracionMinutos?: number;
    ubicacionGPS?: {
      latitud: number;
      longitud: number;
      precision: number;
    };
    dispositivo?: string;
    tipoRecompensa?: string;
  };
  descripcion: string;
  activo: boolean;
  createdAt: Date;
}

export interface Recompensa {
  id: string;
  nombre: string;
  descripcion: string;
  costo: number;
  categoria: 'descuento' | 'producto' | 'experiencia' | 'vip';
  icono: string;
  disponible: boolean;
}

export const RECOMPENSAS_DISPONIBLES: Recompensa[] = [
  {
    id: 'cafe_gratis',
    nombre: 'Café Gratis',
    descripcion: 'Canjea por un café en el bar del billar',
    costo: 500,
    categoria: 'producto',
    icono: '☕',
    disponible: true
  },
  {
    id: 'descuento_20',
    nombre: '20% Descuento',
    descripcion: '20% de descuento en tu próxima hora de juego',
    costo: 1000,
    categoria: 'descuento',
    icono: '🎯',
    disponible: true
  },
  {
    id: 'hora_gratis',
    nombre: 'Hora Gratis',
    descripcion: 'Una hora de juego gratis en cualquier mesa',
    costo: 2500,
    categoria: 'experiencia',
    icono: '🎱',
    disponible: true
  },
  {
    id: 'vip_semana',
    nombre: 'VIP Semana',
    descripcion: 'Acceso VIP por una semana con beneficios exclusivos',
    costo: 5000,
    categoria: 'vip',
    icono: '👑',
    disponible: true
  },
  {
    id: 'camiseta_exclusiva',
    nombre: 'Camiseta Exclusiva',
    descripcion: 'Camiseta edición limitada JcueScore',
    costo: 3000,
    categoria: 'producto',
    icono: '👕',
    disponible: true
  }
];

@Injectable({
  providedIn: 'root'
})
export class LealtadService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);

  balanceActual = signal<BalanceLealtad | null>(null);
  historialTransacciones = signal<TransaccionLealtad[]>([]);
  recompensasDisponibles = signal<Recompensa[]>(RECOMPENSAS_DISPONIBLES);

  obtenerBalance(usuarioId: number): Observable<BalanceLealtad> {
    return this.http.get<BalanceLealtad>(`${this.API_URL}/lealtad/usuario/${usuarioId}/balance`);
  }

  obtenerHistorial(usuarioId: number): Observable<TransaccionLealtad[]> {
    return this.http.get<TransaccionLealtad[]>(`${this.API_URL}/lealtad/usuario/${usuarioId}/historial`);
  }

  minarCoins(usuarioId: number, minutos: number, ubicacionGPS?: { latitud: number; longitud: number }): Observable<any> {
    return this.http.post(`${this.API_URL}/lealtad/minar`, {
      minutos,
      ubicacionGPS
    });
  }

  canjearRecompensa(usuarioId: number, recompensa: Recompensa): Observable<any> {
    return this.http.post(`${this.API_URL}/lealtad/canjear`, {
      tipo: recompensa.id,
      costo: recompensa.costo,
      descripcion: recompensa.nombre
    });
  }

  obtenerLeaderboard(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/lealtad/leaderboard`);
  }

  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/lealtad/estadisticas`);
  }

  // Métodos utilitarios
  getTipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'mining': '⛏️ Mining',
      'ganancia_partida': '🏆 Ganancia Partida',
      'participacion_partida': '🎮 Participación',
      'ganancia_torneo': '🥇 Ganancia Torneo',
      'inscripcion_torneo': '📝 Inscripción Torneo',
      'compra_producto': '🛒 Compra Producto',
      'canje_recompensa': '🎁 Canje Recompensa',
      'bono_admin': '💰 Bono Admin',
      'ajuste_sistema': '⚙️ Ajuste Sistema'
    };
    return labels[tipo] || tipo;
  }

  getCategoriaColor(categoria: string): string {
    const colors: Record<string, string> = {
      'descuento': '#10b981',
      'producto': '#3b82f6',
      'experiencia': '#f59e0b',
      'vip': '#8b5cf6'
    };
    return colors[categoria] || '#64748b';
  }

  getNivelColor(nivel: string): string {
    const colors: Record<string, string> = {
      'Diamante': '#06b6d4',
      'Oro': '#f59e0b',
      'Plata': '#6b7280',
      'Bronce': '#92400e',
      'Novato': '#dc2626'
    };
    return colors[nivel] || '#64748b';
  }

  getProgresoNivel(coinsActuales: number, coinsRequeridos: number): number {
    return Math.min((coinsActuales / coinsRequeridos) * 100, 100);
  }

  // Simulación de geo-fencing para demo
  verificarUbicacion(): Promise<{ dentro: boolean; latitud: number; longitud: number }> {
    return new Promise((resolve) => {
      // Simular verificación GPS
      setTimeout(() => {
        resolve({
          dentro: Math.random() > 0.3, // 70% de probabilidad de estar dentro
          latitud: 4.6097 + (Math.random() - 0.5) * 0.01,
          longitud: -74.0817 + (Math.random() - 0.5) * 0.01
        });
      }, 1000);
    });
  }

  // Iniciar mining automático
  iniciarMining(usuarioId: number): Observable<any> {
    return this.minarCoins(usuarioId, 1);
  }
}
