import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
  private route = inject(ActivatedRoute);

  activeMatches = signal<any[]>([]);
  private activeMatchesSub: any;
  private matchUpdateSub: any;
  private pollingInterval: any;

  ngOnInit() {
    this.activeMatchesSub = this.ws.onActiveMatches().subscribe((matches) => {
      this.activeMatches.set(matches);
    });

    this.matchUpdateSub = this.ws.onMatchUpdate().subscribe((data) => {
      const current = this.activeMatches();
      const index = current.findIndex(m => m.mesaId === data.mesaId);
      if (index >= 0) {
        current[index] = data;
      } else {
        current.push(data);
      }
      this.activeMatches.set([...current]);
    });

    if (this.ws.connectionStatus() === 'conectado') {
      this.ws.send({ type: 'get_active_matches' });
    } else {
      setTimeout(() => {
        if (this.ws.connectionStatus() === 'conectado') {
          this.ws.send({ type: 'get_active_matches' });
        }
      }, 500);
    }

    this.pollingInterval = setInterval(() => {
      if (this.ws.connectionStatus() === 'conectado') {
        this.ws.send({ type: 'get_active_matches' });
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    if (this.activeMatchesSub) {
      this.activeMatchesSub.unsubscribe();
    }
    if (this.matchUpdateSub) {
      this.matchUpdateSub.unsubscribe();
    }
  }

  verPartida(mesaId: string) {
    this.router.navigate(['../espectador-vivo', mesaId], { relativeTo: this.route, queryParams: { mode: 'viewer' } });
  }

  trackByMesaId(index: number, match: any) {
    return match.mesaId;
  }
}
