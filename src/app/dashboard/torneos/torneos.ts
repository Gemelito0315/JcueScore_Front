import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TorneosService, Torneo } from '../../core/services/torneos.service';

export interface TournamentPlayer {
  id: number;
  name: string;
  handicap: number;
  club?: string;
}

export interface GroupMatch {
  id: string;
  p1Id: number;
  p2Id: number;
  p1Score: number;
  p2Score: number;
  innings: number;
  played: boolean;
}

export interface Group {
  id: number;
  name: string;
  players: TournamentPlayer[];
  matches: GroupMatch[];
}

@Component({
  selector: 'app-torneos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './torneos.html',
  styleUrls: ['./torneos.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Torneos implements OnInit {
  private torneosService = inject(TorneosService);

  // ── Estado de carga ──────────────────────────────────
  loading = signal(true);
  error = signal<string | null>(null);

  // ── Estado del torneo activo ─────────────────────────
  torneoActivo = signal<Torneo | null>(null);
  todosLosTorneos = signal<Torneo[]>([]);

  // ── UI State ─────────────────────────────────────────
  activeTab = signal<'inscripcion' | 'grupos' | 'eliminatoria'>('inscripcion');
  jcueCoinsPool = signal<number>(0);
  mostrarModalCrear = signal(false);

  // ── Formulario nuevo torneo ───────────────────────────
  nuevoTorneo = {
    nombre: '',
    formato: 'round_robin' as const,
    maxJugadores: 8,
    costoInscripcion: 500,
    premioTotal: 15000,
    descripcion: ''
  };

  // ── Datos de grupos (UI local con datos reales) ───────
  registeredPlayers = signal<TournamentPlayer[]>([]);
  groups = signal<Group[]>([]);
  bracketRounds = signal<any[]>([]);

  // ── Ruleta de Sorteos ─────────────────────────────────
  ruletaActiva = signal(false);
  ruletaGirando = signal(false);
  nombreAnimado1 = signal('???');
  nombreAnimado2 = signal('???');

  iniciarSorteo() {
    const activo = this.torneoActivo();
    if (!activo) return;

    this.ruletaActiva.set(true);
    this.ruletaGirando.set(true);
    this.nombreAnimado1.set('Preparando...');
    this.nombreAnimado2.set('Preparando...');

    const players = this.registeredPlayers();
    
    // Animación de ruleta
    const interval = setInterval(() => {
      if (players.length >= 2) {
         this.nombreAnimado1.set(players[Math.floor(Math.random() * players.length)].name);
         this.nombreAnimado2.set(players[Math.floor(Math.random() * players.length)].name);
      }
    }, 100);

    this.torneosService.generarPartidos(activo.id).subscribe({
      next: () => {
        setTimeout(() => {
          clearInterval(interval);
          this.ruletaGirando.set(false);
          this.nombreAnimado1.set('¡Sorteo');
          this.nombreAnimado2.set('Completado!');
          setTimeout(() => {
            this.ruletaActiva.set(false);
            this.cargarTorneos();
            this.switchTab('grupos');
          }, 2000);
        }, 4000);
      },
      error: (err) => {
        console.error('Error generando partidos', err);
        clearInterval(interval);
        this.ruletaActiva.set(false);
        alert('Hubo un error al generar los partidos. Verifica que haya suficientes jugadores.');
      }
    });
  }

  ngOnInit() {
    this.cargarTorneos();
  }

  cargarTorneos() {
    this.loading.set(true);
    this.error.set(null);

    this.torneosService.obtenerTorneosActivos().subscribe({
      next: (torneos) => {
        this.todosLosTorneos.set(torneos);

        if (torneos.length > 0) {
          const activo = torneos[0];
          this.torneoActivo.set(activo);
          this.jcueCoinsPool.set(activo.premioTotal || 0);

          // Mapear inscripciones del torneo a jugadores
          if (activo.inscripciones && activo.inscripciones.length > 0) {
            const players: TournamentPlayer[] = activo.inscripciones.map(ins => ({
              id: ins.jugadorId,
              name: ins.jugador?.name || `Jugador #${ins.jugadorId}`,
              handicap: ins.handicap || 30,
              club: ins.jugador?.club || 'Sin Club'
            }));
            this.registeredPlayers.set(players);
          } else {
            this.registeredPlayers.set([]);
          }

          // Grupos y bracket: Solo usar datos reales
          if (activo.partidos && activo.partidos.length > 0) {
            // TODO: mapear partidos reales a grupos/brackets aquí
          } else {
            this.groups.set([]);
            this.bracketRounds.set([]);
          }
        } else {
          // Sin torneo activo
          this.torneoActivo.set(null);
          this.jcueCoinsPool.set(0);
          this.registeredPlayers.set([]);
          this.groups.set([]);
          this.bracketRounds.set([]);
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando torneos:', err);
        this.torneoActivo.set(null);
        this.jcueCoinsPool.set(0);
        this.registeredPlayers.set([]);
        this.groups.set([]);
        this.bracketRounds.set([]);
        this.loading.set(false);
      }
    });
  }

  crearTorneo() {
    if (!this.nuevoTorneo.nombre.trim()) return;

    this.torneosService.crearTorneo({
      nombre: this.nuevoTorneo.nombre,
      formato: this.nuevoTorneo.formato,
      maxJugadores: this.nuevoTorneo.maxJugadores,
      costoInscripcion: this.nuevoTorneo.costoInscripcion,
      premioTotal: this.nuevoTorneo.premioTotal,
      descripcion: this.nuevoTorneo.descripcion
    }).subscribe({
      next: () => {
        this.mostrarModalCrear.set(false);
        this.nuevoTorneo = { nombre: '', formato: 'round_robin', maxJugadores: 8, costoInscripcion: 500, premioTotal: 15000, descripcion: '' };
        this.cargarTorneos();
      },
      error: (err) => console.error('Error creando torneo:', err)
    });
  }

  switchTab(tab: 'inscripcion' | 'grupos' | 'eliminatoria') {
    this.activeTab.set(tab);
  }

  getPlayerName(id: number, group: Group): string {
    return group.players.find(p => p.id === id)?.name || 'Desconocido';
  }

  getPromedio(playerId: number, group: Group): string {
    let tScore = 0;
    let tInnings = 0;
    group.matches.forEach(m => {
      if (m.played) {
        if (m.p1Id === playerId) { tScore += m.p1Score; tInnings += m.innings; }
        else if (m.p2Id === playerId) { tScore += m.p2Score; tInnings += m.innings; }
      }
    });
    return tInnings === 0 ? '0.000' : (tScore / tInnings).toFixed(3);
  }

  getMatchesPlayed(playerId: number, group: Group): number {
    return group.matches.filter(m => m.played && (m.p1Id === playerId || m.p2Id === playerId)).length;
  }

  getFormatoLabel(fmt: string): string {
    return this.torneosService.getFormatoLabel(fmt);
  }

  getEstadoLabel(est: string): string {
    return this.torneosService.getEstadoLabel(est);
  }
}
