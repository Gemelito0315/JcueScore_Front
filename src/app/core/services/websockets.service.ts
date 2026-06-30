import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WebSocketMessage {
  type: 'partida_actualizada' | 'nueva_reserva' | 'torneo_actualizado' | 'mining_actualizado' | 'sistema_mantenimiento' | 'match_update' | 'active_matches' | 'solicitar_cuenta' | 'cerrar_cuenta';
  data: any;
  timestamp: Date;
}

export interface PartidaActualizada {
  mesaId: number;
  estado: 'iniciada' | 'en_juego' | 'finalizada';
  jugadores?: string[];
  marcador?: { j1: number; j2: number };
  tiempoTranscurrido?: string;
  costoActual?: number;
  tiempoInicio?: Date | string;
  partidaId?: number;
}

export interface NuevaReserva {
  id: number;
  usuario: string;
  mesa: string;
  fecha: string;
  hora: string;
  duracion: number;
}

export interface TorneoActualizado {
  torneoId: number;
  tipo: 'inscripcion_nueva' | 'partido_finalizado' | 'torneo_iniciado' | 'torneo_finalizado';
  datos: any;
}

export interface MiningActualizado {
  usuarioId: number;
  coinsMinados: number;
  balanceNuevo: number;
  tiempoMinando: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketsService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Signals para estado en tiempo real
  partidasActivas = signal<PartidaActualizada[]>([]);
  notificaciones = signal<string[]>([]);
  miningStatus = signal<MiningActualizado | null>(null);
  connectionStatus = signal<'conectado' | 'desconectado' | 'reconectando'>('desconectado');

  // Subjects para streams específicos
  private partidasSubject = new Subject<PartidaActualizada>();
  private reservasSubject = new Subject<NuevaReserva>();
  private torneosSubject = new Subject<TorneoActualizado>();
  private miningSubject = new Subject<MiningActualizado>();
  private matchUpdateSubject = new Subject<any>();
  private activeMatchesSubject = new Subject<any[]>();
  private solicitarCuentaSubject = new Subject<any>();
  private cerrarCuentaSubject = new Subject<any>();
  private mantenimientoSubject = new Subject<{ activo: boolean; mensaje?: string; estimatedTime?: string }>();

  // Signal reactivo para bloquear el login en tiempo real
  maintenanceActive = signal<boolean | null>(null); // null = aún no consultado

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      let wsUrl = environment.wsUrl;
      if (wsUrl && !wsUrl.endsWith('/ws')) {
        wsUrl = wsUrl.replace(/\/$/, '') + '/ws';
      }
      this.socket = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('Error conectando WebSocket:', error);
      this.handleReconnect();
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log('WebSocket conectado');
      this.connectionStatus.set('conectado');
      this.reconnectAttempts = 0;
      
      // Enviar mensaje de autenticación solo si hay token
      const token = localStorage.getItem('token');
      if (token) {
        this.send({
          type: 'auth',
          token: token
        });
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error procesando mensaje WebSocket:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket desconectado');
      this.connectionStatus.set('desconectado');
      this.handleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('Error WebSocket:', error);
      this.connectionStatus.set('desconectado');
    };
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'partida_actualizada':
        this.handlePartidaActualizada(message.data);
        break;
      case 'nueva_reserva':
        this.handleNuevaReserva(message.data);
        break;
      case 'torneo_actualizado':
        this.handleTorneoActualizado(message.data);
        break;
      case 'mining_actualizado':
        this.handleMiningActualizado(message.data);
        break;
      case 'sistema_mantenimiento':
        this.handleSistemaMantenimiento(message.data);
        break;
      case 'match_update':
        this.matchUpdateSubject.next(message.data);
        break;
      case 'active_matches':
        this.activeMatchesSubject.next(message.data);
        break;
      case 'solicitar_cuenta':
        this.solicitarCuentaSubject.next(message.data);
        this.addNotificación(`🧾 Mesa ${message.data?.mesaId || '?'} solicita la cuenta`);
        break;
      case 'cerrar_cuenta':
        this.cerrarCuentaSubject.next(message.data);
        break;
    }
  }

  private handlePartidaActualizada(data: PartidaActualizada) {
    this.partidasSubject.next(data);
    
    // Actualizar signal de partidas activas
    const actuales = this.partidasActivas();
    const index = actuales.findIndex(p => p.mesaId === data.mesaId);
    
    if (index >= 0) {
      actuales[index] = data;
    } else {
      actuales.push(data);
    }
    
    this.partidasActivas.set([...actuales]);
    
    // Notificación
    this.addNotificación(`🎱 Mesa ${data.mesaId}: ${data.estado}`);
  }

  private handleNuevaReserva(data: NuevaReserva) {
    this.reservasSubject.next(data);
    this.addNotificación(`📅 Nueva reserva: ${data.usuario} - ${data.mesa}`);
  }

  private handleTorneoActualizado(data: TorneoActualizado) {
    this.torneosSubject.next(data);
    
    const mensajes = {
      'inscripcion_nueva': `🏆 Nueva inscripción en torneo`,
      'partido_finalizado': `🎯 Partido finalizado en torneo`,
      'torneo_iniciado': `🚀 Torneo iniciado`,
      'torneo_finalizado': `🏅 Torneo finalizado`
    };
    
    this.addNotificación(mensajes[data.tipo] || 'Torneo actualizado');
  }

  private handleMiningActualizado(data: MiningActualizado) {
    this.miningSubject.next(data);
    this.miningStatus.set(data);
  }

  private handleSistemaMantenimiento(data: { activo: boolean; mensaje?: string }) {
    // Update the reactive signal so login and other components can react instantly
    this.maintenanceActive.set(data.activo);
    this.mantenimientoSubject.next(data);
    if (data.activo) {
      this.addNotificación(`🔧 Sistema en mantenimiento: ${data.mensaje || 'Momentáneamente'}`);
    } else {
      this.addNotificación('✅ Sistema operativo nuevamente');
    }
  }

  private addNotificación(mensaje: string) {
    const actuales = this.notificaciones();
    actuales.unshift(mensaje);
    
    // Mantener solo últimas 10 notificaciones
    if (actuales.length > 10) {
      actuales.pop();
    }
    
    this.notificaciones.set([...actuales]);
    
    // Auto-eliminar notificación después de 5 segundos
    setTimeout(() => {
      this.removeNotificación(mensaje);
    }, 5000);
  }

  private removeNotificación(mensaje: string) {
    const actuales = this.notificaciones();
    const index = actuales.indexOf(mensaje);
    if (index > -1) {
      actuales.splice(index, 1);
      this.notificaciones.set([...actuales]);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionStatus.set('reconectando');
      
      setTimeout(() => {
        console.log(`Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Máximo de intentos de reconexión alcanzado');
      this.addNotificación('❌ Error de conexión en tiempo real');
    }
  }

  // Métodos públicos para enviar mensajes
  send(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  // Métodos para suscribirse a streams específicos
  onPartidaActualizada() {
    return this.partidasSubject.asObservable();
  }

  onNuevaReserva() {
    return this.reservasSubject.asObservable();
  }

  onTorneoActualizado() {
    return this.torneosSubject.asObservable();
  }

  onMiningActualizado() {
    return this.miningSubject.asObservable();
  }

  onMatchUpdate() {
    return this.matchUpdateSubject.asObservable();
  }

  onActiveMatches() {
    return this.activeMatchesSubject.asObservable();
  }

  onSolicitarCuenta() {
    return this.solicitarCuentaSubject.asObservable();
  }

  onCerrarCuenta() {
    return this.cerrarCuentaSubject.asObservable();
  }

  onMantenimiento() {
    return this.mantenimientoSubject.asObservable();
  }

  // Método para desconectar manualmente
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Método para reconectar manualmente
  reconnect() {
    this.reconnectAttempts = 0;
    this.connect();
  }
}
