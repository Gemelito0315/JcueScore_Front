import { Component, signal, OnInit, OnDestroy, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WebsocketsService } from '../../../core/services/websockets.service';

@Component({
  selector: 'app-espectador-vivo',
  imports: [CommonModule],
  templateUrl: './espectador-vivo.page.html',
  styleUrl: './espectador-vivo.page.scss',
  encapsulation: ViewEncapsulation.None
})
export class EspectadorVivoPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ws = inject(WebsocketsService);

  mesaId = signal('');
  matchState = signal<any>(null);
  private matchSub: any;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('mesaId');
    if (id) {
      this.mesaId.set(id);
    }

    this.matchSub = this.ws.onMatchUpdate().subscribe((data) => {
      if (data.mesaId === this.mesaId()) {
        this.matchState.set(data.state);
      }
    });

    setTimeout(() => {
      // Unirse a la sala para recibir updates específicos de esta mesa
      this.ws.send({ type: 'join_match', mesaId: this.mesaId() });
    }, 500);
  }

  ngOnDestroy() {
    if (this.matchSub) {
      this.matchSub.unsubscribe();
    }
    this.ws.send({ type: 'leave_match', mesaId: this.mesaId() });
  }

  volver() {
    this.router.navigate(['../../espectador'], { relativeTo: this.route });
  }

  get tiempoFormateado() {
    const t = this.matchState()?.tiempoSegundos || 0;
    const h = Math.floor(t / 3600).toString().padStart(2, '0');
    const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
    const s = (t % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}
