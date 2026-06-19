import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WebsocketsService } from '../../../core/services/websockets.service';

@Component({
  selector: 'app-espectador-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './espectador.page.html',
  styleUrl: './espectador.page.scss'
})
export class EspectadorLobbyPage implements OnInit, OnDestroy {
  private ws = inject(WebsocketsService);
  private router = inject(Router);

  activeMatches = signal<any[]>([]);
  liveToast = signal<{ mesaId: string; jugadores: string } | null>(null);

  private activeMatchesSub: any;
  private matchUpdateSub: any;
  private pollingInterval: any;
  private toastTimeout: any;

  /** IDs de mesas que ya conocemos, para detectar partidas NUEVAS */
  private knownMesaIds = new Set<string>();

  ngOnInit() {
    // Escuchar la lista completa de partidas activas
    this.activeMatchesSub = this.ws.onActiveMatches().subscribe((matches) => {
      const prev = this.knownMesaIds.size;
      this.activeMatches.set(matches);
      matches.forEach((m: any) => this.knownMesaIds.add(String(m.mesaId)));
      // No mostrar toast en la carga inicial
    });

    // Escuchar actualizaciones individuales de partida
    this.matchUpdateSub = this.ws.onMatchUpdate().subscribe((data) => {
      const current = this.activeMatches();
      const mesaId = String(data.mesaId);
      const index = current.findIndex((m) => String(m.mesaId) === mesaId);

      const isNewMatch = index < 0 && data.state?.partidaIniciada !== false;

      if (index >= 0) {
        current[index] = data;
      } else if (isNewMatch) {
        current.push(data);
      }

      this.activeMatches.set([...current]);

      // 🔔 Si es una partida NUEVA que no estaba antes → mostrar toast in-app
      if (isNewMatch && !this.knownMesaIds.has(mesaId)) {
        this.knownMesaIds.add(mesaId);
        const j = data.state?.jugadores;
        const jugadores = j?.length
          ? `${j[0]?.nombre || ''}${j[1]?.nombre ? ' vs ' + j[1].nombre : ''}`
          : 'Mesa ' + mesaId;
        this.showLiveToast(mesaId, jugadores);
      }

      // Si la partida terminó, quitar de la lista conocida
      if (data.state?.partidaIniciada === false) {
        this.knownMesaIds.delete(mesaId);
        const updated = current.filter((m) => String(m.mesaId) !== mesaId);
        this.activeMatches.set(updated);
      }
    });

    // Solicitar partidas activas al conectar
    const requestMatches = () => {
      if (this.ws.connectionStatus() === 'conectado') {
        this.ws.send({ type: 'get_active_matches' });
      }
    };
    requestMatches();
    setTimeout(requestMatches, 500);

    // Polling cada 5s (reducido de 1s para no saturar)
    this.pollingInterval = setInterval(requestMatches, 5000);
  }

  ngOnDestroy() {
    clearInterval(this.pollingInterval);
    clearTimeout(this.toastTimeout);
    this.activeMatchesSub?.unsubscribe();
    this.matchUpdateSub?.unsubscribe();
  }

  /** Muestra el toast de nueva partida en vivo durante 8 segundos */
  private showLiveToast(mesaId: string, jugadores: string) {
    clearTimeout(this.toastTimeout);
    this.liveToast.set({ mesaId, jugadores });
    this.toastTimeout = setTimeout(() => this.liveToast.set(null), 8000);
  }

  dismissToast() {
    clearTimeout(this.toastTimeout);
    this.liveToast.set(null);
  }

  verPartida(mesaId: string) {
    this.router.navigate(['/mesa', mesaId], { queryParams: { mode: 'viewer' } });
  }

  verPartidaDesdeToast() {
    const toast = this.liveToast();
    if (toast) {
      this.dismissToast();
      this.verPartida(toast.mesaId);
    }
  }

  trackByMesaId(_index: number, match: any) {
    return match.mesaId;
  }
}
