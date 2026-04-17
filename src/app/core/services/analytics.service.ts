import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MetricaTiempoReal {
  mesasOcupadas: number;
  mesasDisponibles: number;
  ingresoHoraActual: number;
  usuariosActivos: number;
  reservasHoy: number;
  partidosEnJuego: number;
}

export interface MetricasDiarias {
  fecha: string;
  totalIngresos: number;
  totalPartidas: number;
  totalUsuarios: number;
  promedioDuracionPartidas: number;
  productosMasVendidos: Array<{
    nombre: string;
    cantidad: number;
    ingresos: number;
  }>;
  horasPico: Array<{
    hora: number;
    ocupacion: number;
  }>;
}

export interface MetricasSemanal {
  semana: string;
  tendenciaIngresos: 'subiendo' | 'estable' | 'bajando';
  crecimientoUsuarios: number;
  ocupacionPromedio: number;
  ingresoPromedioDiario: number;
  topJugadores: Array<{
    nombre: string;
    partidasJugadas: number;
    ingresosGenerados: number;
    eloRating: number;
  }>;
}

export interface EventoPersonalizado {
  tipo: 'click_boton' | 'vista_pagina' | 'inicio_sesion' | 'completado_registro' | 'reserva_creada' | 'partida_iniciada';
  datos: {
    pagina?: string;
    boton?: string;
    usuarioId?: number;
    sessionId?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);

  // Signals para métricas en tiempo real
  metricasTiempoReal = signal<MetricaTiempoReal>({
    mesasOcupadas: 0,
    mesasDisponibles: 0,
    ingresoHoraActual: 0,
    usuariosActivos: 0,
    reservasHoy: 0,
    partidosEnJuego: 0
  });

  metricasDiarias = signal<MetricasDiarias | null>(null);
  metricasSemanales = signal<MetricasSemanal | null>(null);

  constructor() {
    this.iniciarActualizacionTiempoReal();
  }

  private iniciarActualizacionTiempoReal() {
    setInterval(() => {
      this.obtenerMetricasTiempoReal().subscribe();
    }, 30000); // Actualizar cada 30 segundos
  }

  obtenerMetricasTiempoReal(): Observable<MetricaTiempoReal> {
    return this.http.get<MetricaTiempoReal>(`${this.API_URL}/analytics/tiempo-real`).pipe(
      // Actualizar signal con nuevos datos
      // this.metricasTiempoReal.set(data)
    );
  }

  obtenerMetricasDiarias(fecha?: string): Observable<MetricasDiarias> {
    const fechaParam = fecha || new Date().toISOString().split('T')[0];
    return this.http.get<MetricasDiarias>(`${this.API_URL}/analytics/diarias/${fechaParam}`).pipe(
      // this.metricasDiarias.set(data)
    );
  }

  obtenerMetricasSemanales(): Observable<MetricasSemanal> {
    return this.http.get<MetricasSemanal>(`${this.API_URL}/analytics/semanales`).pipe(
      // this.metricasSemanales.set(data)
    );
  }

  // Métodos para tracking de eventos personalizados
  trackEvento(evento: EventoPersonalizado) {
    this.http.post(`${this.API_URL}/analytics/evento`, evento).subscribe({
      error: (err) => console.error('Error tracking evento:', err)
    });
  }

  trackPageView(pagina: string, usuarioId?: number) {
    this.trackEvento({
      tipo: 'vista_pagina',
      datos: {
        pagina,
        usuarioId,
        timestamp: new Date(),
        sessionId: this.getSessionId()
      }
    });
  }

  trackButtonClick(boton: string, pagina?: string, usuarioId?: number) {
    this.trackEvento({
      tipo: 'click_boton',
      datos: {
        boton,
        pagina,
        usuarioId,
        timestamp: new Date(),
        sessionId: this.getSessionId()
      }
    });
  }

  trackUserLogin(usuarioId: number) {
    this.trackEvento({
      tipo: 'inicio_sesion',
      datos: {
        usuarioId,
        timestamp: new Date(),
        sessionId: this.getSessionId()
      }
    });
  }

  trackReservaCreada(usuarioId: number, datosReserva: any) {
    this.trackEvento({
      tipo: 'reserva_creada',
      datos: {
        usuarioId,
        timestamp: new Date(),
        sessionId: this.getSessionId(),
        metadata: datosReserva
      }
    });
  }

  trackPartidaIniciada(usuarioId: number, datosPartida: any) {
    this.trackEvento({
      tipo: 'partida_iniciada',
      datos: {
        usuarioId,
        timestamp: new Date(),
        sessionId: this.getSessionId(),
        metadata: datosPartida
      }
    });
  }

  // Utilitarios
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  // Métodos de cálculo para dashboard
  getOcupacionPorcentaje(): number {
    const metricas = this.metricasTiempoReal();
    const total = metricas.mesasOcupadas + metricas.mesasDisponibles;
    return total > 0 ? Math.round((metricas.mesasOcupadas / total) * 100) : 0;
  }

  getTendenciaIngresos(): 'subiendo' | 'estable' | 'bajando' {
    const metricas = this.metricasTiempoReal();
    // Lógica simplificada - en producción usaría datos históricos
    if (metricas.ingresoHoraActual > 50000) return 'subiendo';
    if (metricas.ingresoHoraActual < 20000) return 'bajando';
    return 'estable';
  }

  getHoraPicoSugerida(): string {
    const metricas = this.metricasDiarias();
    if (!metricas || !metricas.horasPico.length) return 'No hay datos suficientes';
    
    const horaPico = metricas.horasPico.reduce((max, hora) => 
      hora.ocupacion > max.ocupacion ? hora : max
    );
    
    return `${horaPico.hora}:00 - ${horaPico.hora + 1}:00`;
  }

  getEficienciaOperativa(): number {
    const metricas = this.metricasTiempoReal();
    const capacidadTotal = metricas.mesasOcupadas + metricas.mesasDisponibles;
    const utilizacion = capacidadTotal > 0 ? metricas.mesasOcupadas / capacidadTotal : 0;
    return Math.round(utilizacion * 100);
  }

  // Predicciones simples (para dashboard avanzado)
  predecirOcupacionProximaHora(): number {
    const metricas = this.metricasTiempoReal();
    const horaActual = new Date().getHours();
    
    // Lógica simple basada en patrones típicos de billares
    if (horaActual >= 19 && horaActual <= 23) return 85; // Horas pico
    if (horaActual >= 14 && horaActual <= 18) return 60; // Tarde
    if (horaActual >= 10 && horaActual <= 13) return 40; // Mediodía
    return 20; // Mañana temprano/noche
  }

  getSugerenciaOptimizacion(): string {
    const ocupacion = this.getOcupacionPorcentaje();
    const tendencia = this.getTendenciaIngresos();
    
    if (ocupacion > 90) {
      return '🔥 Alta demanda: Considera aumentar precios o abrir más mesas';
    } else if (ocupacion < 30) {
      return '📉 Baja ocupación: Lanza promociones para atraer más jugadores';
    } else if (tendencia === 'bajando') {
      return '📊 Ingresos bajando: Revisa tu estrategia de precios';
    } else {
      return '✅ Operación estable: Mantén el desempeño actual';
    }
  }
}
