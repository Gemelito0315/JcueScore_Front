import { Component, signal, inject, OnInit, OnDestroy, effect, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PlayerCardComponent } from '../../player-card/player-card';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../auth/services/auth';
import { GeoService } from '../../../core/services/geo.service';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-usuario-inicio',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class UsuarioInicio implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  public geoService = inject(GeoService);

  // Stats del usuario (desde backend)
  historialJuegos = signal(0);
  jcueCoins       = signal(0);
  eloRating       = signal(1000);
  winRate         = signal(50);
  clubName        = signal('Sin Club');
  loadingStats    = signal(true);

  // Partida activa (Mesa ocupada en vivo)
  partidaActiva = signal<any | null>(null);
  cronometroActivo = signal<string>('00:00:00');
  costoAcumulado = signal<number>(0);
  llamadoPendiente = signal<boolean>(false);

  // Peticiones de mesa en tiempo real
  mesasDisponibles = signal<any[]>([]);
  mostrandoModalPeticion = signal(false);
  mesaSeleccionadaId = signal<number | null>(null);
  oponenteName = signal<string>('');
  solicitudPendiente = signal<any | null>(null);

  // Geo-lealtad
  avatarUrl = signal<string | null>(localStorage.getItem('avatarUrl'));

  private miningInterval: any;
  private dataPollingInterval: any;
  private liveClockInterval: any;
  private avatarListener = () => this.avatarUrl.set(localStorage.getItem('avatarUrl'));

  constructor() {
    // Reaccionar a cambios en el GPS para minar lealtad solo cuando esté dentro
    effect(() => {
      const isInside = this.geoService.isInsideVenue();
      if (isInside) {
        if (!this.miningInterval) {
          this.iniciarMinadoReal();
        }
      } else {
        if (this.miningInterval) {
          clearInterval(this.miningInterval);
          this.miningInterval = null;
        }
      }
    });
  }

  ngOnInit() {
    this.cargarStats();
    this.cargarPartidaActiva();
    this.cargarMesasDisponibles();
    this.cargarSolicitudMesaPendiente();
    
    // Polling de estadísticas y partida activa cada 4 segundos
    this.dataPollingInterval = setInterval(() => {
      this.cargarStats();
      this.cargarPartidaActiva();
      this.cargarMesasDisponibles();
      this.cargarSolicitudMesaPendiente();
    }, 4000);

    // Reloj secundario para actualizar los cronómetros cada segundo
    this.liveClockInterval = setInterval(() => this.tickCronometro(), 1000);

    window.addEventListener('avatarUpdated', this.avatarListener);
  }

  ngOnDestroy() {
    if (this.miningInterval) clearInterval(this.miningInterval);
    if (this.dataPollingInterval) clearInterval(this.dataPollingInterval);
    if (this.liveClockInterval) clearInterval(this.liveClockInterval);
    window.removeEventListener('avatarUpdated', this.avatarListener);
  }

  cargarStats() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) { this.loadingStats.set(false); return; }

    this.http.get<any>(`${API}/users/me`).subscribe({
      next: (u) => {
        this.jcueCoins.set(u.loyaltyPoints ?? u.jcueCoins ?? u.loyalty?.coins ?? 0);
        this.eloRating.set(u.eloRating ?? 1000);
        this.clubName.set(u.club?.name || 'Sin Club');
        this.loadingStats.set(false);
      },
      error: () => this.loadingStats.set(false)
    });

    // Historial de partidas
    this.http.get<any[]>(`${API}/users/me/partidas`).subscribe({
      next: (partidas) => {
        this.historialJuegos.set(partidas.length);
        if (partidas.length > 0) {
          const wins = partidas.filter(p => p.ganadorId === userId).length;
          this.winRate.set(Math.round((wins / partidas.length) * 100));
        } else {
          this.winRate.set(0);
        }
      },
      error: () => {}
    });
  }

  cargarPartidaActiva() {
    this.http.get<any>(`${API}/partidas/me/activa`).subscribe({
      next: (partida) => {
        this.partidaActiva.set(partida);
        if (partida) {
          // Si tiene partida activa, limpia solicitudes pendientes
          this.solicitudPendiente.set(null);
        }
        this.tickCronometro();
      },
      error: () => {
        this.partidaActiva.set(null);
      }
    });
  }

  cargarMesasDisponibles() {
    this.http.get<any[]>(`${API}/recursos`).subscribe({
      next: (mesas) => {
        this.mesasDisponibles.set(mesas.filter(m => m.status === 'available'));
      },
      error: () => {}
    });
  }

  cargarSolicitudMesaPendiente() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.http.get<any[]>(`${API}/operaciones/llamados/activos`).subscribe({
      next: (llamados) => {
        const miPeticion = llamados.find(l => l.usuarioId === user.id && l.mensaje?.startsWith('[PETICION_MESA]'));
        this.solicitudPendiente.set(miPeticion || null);
      },
      error: () => {}
    });
  }

  abrirPeticionMesa() {
    this.cargarMesasDisponibles();
    this.mostrandoModalPeticion.set(true);
  }

  cerrarPeticionMesa() {
    this.mostrandoModalPeticion.set(false);
    this.mesaSeleccionadaId.set(null);
    this.oponenteName.set('');
  }

  enviarPeticionMesa() {
    const mesaId = this.mesaSeleccionadaId();
    if (!mesaId) {
      alert('Por favor selecciona una mesa.');
      return;
    }

    const mesa = this.mesasDisponibles().find(m => m.id === mesaId);
    const codeMesa = mesa ? mesa.code : `Mesa ${mesaId}`;
    const desc = `[PETICION_MESA] Oponente: ${this.oponenteName().trim() || 'Juego Libre'}`;

    this.http.post(`${API}/operaciones/llamados/crear`, {
      recursoId: mesaId,
      mensaje: desc
    }).subscribe({
      next: (res) => {
        this.solicitudPendiente.set(res);
        this.cerrarPeticionMesa();
        alert(`Solicitud de mesa ${codeMesa} enviada. Espera a que el garitero la apruebe para iniciar.`);
      },
      error: () => {
        alert('Error al enviar la solicitud.');
      }
    });
  }

  cancelarSolicitudPendiente() {
    const sol = this.solicitudPendiente();
    if (!sol) return;

    if (!confirm('¿Seguro que deseas cancelar esta solicitud?')) return;

    this.http.post(`${API}/operaciones/llamados/${sol.id}/atender`, {}).subscribe({
      next: () => {
        this.solicitudPendiente.set(null);
        alert('Solicitud cancelada.');
      }
    });
  }

  tickCronometro() {
    const partida = this.partidaActiva();
    if (!partida) return;

    const diffMs = Date.now() - new Date(partida.horaInicio).getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    const h = Math.floor(diffSecs / 3600).toString().padStart(2, '0');
    const m = Math.floor((diffSecs % 3600) / 60).toString().padStart(2, '0');
    const s = (diffSecs % 60).toString().padStart(2, '0');

    this.cronometroActivo.set(`${h}:${m}:${s}`);

    const precioHora = parseFloat(partida.recursoPricePerHour || 15000);
    const horasTranscurridas = diffSecs / 3600;
    this.costoAcumulado.set(Math.round(horasTranscurridas * precioHora));
  }

  llamarAlGaritero() {
    const partida = this.partidaActiva();
    if (!partida) return;

    const mensaje = prompt('¿Qué necesitas? (Ej: "Tiza", "Bebida", "Llamar Garitero", "Pedir Cuenta"):');
    if (!mensaje) return;

    this.llamadoPendiente.set(true);
    this.http.post(`${API}/operaciones/llamados/crear`, {
      recursoId: partida.recursoId,
      mensaje: mensaje
    }).subscribe({
      next: () => {
        alert('Llamado enviado al garitero. Ya se dirigen hacia tu mesa.');
        this.llamadoPendiente.set(false);
      },
      error: () => {
        alert('Error al enviar el llamado. Inténtalo de nuevo.');
        this.llamadoPendiente.set(false);
      }
    });
  }

  iniciarMinadoReal() {
    this.miningInterval = setInterval(() => {
      const userId = this.auth.currentUser()?.id;
      if (!userId) return;
      this.jcueCoins.update(c => c + 1);
      this.http.post(`${API}/users/${userId}/mine-loyalty`, { coins: 1, minutes: 1 }).subscribe({
        error: (err) => console.log('Sincronización Coins fallida', err)
      });
    }, 60000);
  }

  get currentUserData() { return this.auth.currentUser(); }

  get playerStats() {
    const user = this.currentUserData;
    let rank: 'Bronze' | 'Silver' | 'Gold' | 'Diamond' = 'Bronze';
    const elo = this.eloRating();
    if (elo >= 2200) rank = 'Diamond';
    else if (elo >= 1800) rank = 'Gold';
    else if (elo >= 1400) rank = 'Silver';

    return {
      name: user?.name ?? 'Jugador',
      lastName: user?.lastName ?? '',
      eloRating: elo,
      winRate: this.winRate(),
      jcueCoins: this.jcueCoins(),
      rank,
      clubName: this.clubName()
    };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(value || 0);
  }
}
