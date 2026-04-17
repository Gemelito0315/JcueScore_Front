import { Component, signal, inject, OnInit } from '@angular/core';
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
  styleUrls: ['./torneos.scss']
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

  // ── Datos mock de demo (fallback si no hay torneo) ────
  private readonly MOCK_PLAYERS: TournamentPlayer[] = [
    { id: 1, name: 'Juan Pérez', handicap: 30, club: 'Los Héroes' },
    { id: 2, name: 'Carlos Díaz', handicap: 25, club: 'Sin Club' },
    { id: 3, name: 'Manuel Rojas', handicap: 30, club: 'JcueScore Elite' },
    { id: 4, name: 'Alberto Solis', handicap: 20, club: 'Master Club' },
    { id: 5, name: 'Miguel Gómez', handicap: 40, club: 'Los Héroes' },
    { id: 6, name: 'Fernando Paz', handicap: 25, club: 'Diamante' },
  ];

  private readonly MOCK_GROUPS: Group[] = [
    {
      id: 1, name: 'Grupo A',
      players: [
        { id: 1, name: 'Juan Pérez', handicap: 30 },
        { id: 2, name: 'Carlos Díaz', handicap: 25 },
        { id: 3, name: 'Manuel Rojas', handicap: 30 }
      ],
      matches: [
        { id: 'g1m1', p1Id: 1, p2Id: 2, p1Score: 30, p2Score: 18, innings: 24, played: true },
        { id: 'g1m2', p1Id: 1, p2Id: 3, p1Score: 30, p2Score: 28, innings: 31, played: true },
        { id: 'g1m3', p1Id: 2, p2Id: 3, p1Score: 0, p2Score: 0, innings: 0, played: false },
      ]
    },
    {
      id: 2, name: 'Grupo B',
      players: [
        { id: 4, name: 'Alberto Solis', handicap: 20 },
        { id: 5, name: 'Miguel Gómez', handicap: 40 },
        { id: 6, name: 'Fernando Paz', handicap: 25 }
      ],
      matches: [
        { id: 'g2m1', p1Id: 4, p2Id: 5, p1Score: 20, p2Score: 38, innings: 30, played: true },
        { id: 'g2m2', p1Id: 4, p2Id: 6, p1Score: 18, p2Score: 25, innings: 28, played: true },
        { id: 'g2m3', p1Id: 5, p2Id: 6, p1Score: 0, p2Score: 0, innings: 0, played: false },
      ]
    }
  ];

  private readonly MOCK_BRACKET = [
    {
      name: 'Semifinal',
      matches: [
        { id: 'sf1', p1: 'Juan Pérez', p1Sub: 'PG 1.090', p2: 'Alberto Solis', p2Sub: 'PG 0.655', p1Score: 30, p2Score: 19, status: 'finished' },
        { id: 'sf2', p1: 'Miguel Gómez', p1Sub: 'PG 1.266', p2: 'Fernando Paz', p2Sub: 'PG 0.892', p1Score: 15, p2Score: 14, status: 'live' }
      ]
    },
    {
      name: 'Gran Final',
      matches: [
        { id: 'f1', p1: 'Juan Pérez', p1Sub: 'Ganador SF1', p2: 'TBD', p2Sub: 'Ganador SF2', p1Score: 0, p2Score: 0, status: 'waiting' }
      ]
    }
  ];

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

          // Grupos y bracket: usar mock por ahora si no hay partidos reales
          if (!activo.partidos || activo.partidos.length === 0) {
            this.groups.set(this.MOCK_GROUPS);
            this.bracketRounds.set(this.MOCK_BRACKET);
          } else {
            this.groups.set(this.MOCK_GROUPS); // TODO: mapear partidos reales a grupos
            this.bracketRounds.set(this.MOCK_BRACKET);
          }
        } else {
          // Sin torneo activo — usar demo
          this.torneoActivo.set(null);
          this.jcueCoinsPool.set(15000);
          this.registeredPlayers.set(this.MOCK_PLAYERS);
          this.groups.set(this.MOCK_GROUPS);
          this.bracketRounds.set(this.MOCK_BRACKET);
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando torneos:', err);
        // En caso de error de red usar datos demo
        this.torneoActivo.set(null);
        this.jcueCoinsPool.set(15000);
        this.registeredPlayers.set(this.MOCK_PLAYERS);
        this.groups.set(this.MOCK_GROUPS);
        this.bracketRounds.set(this.MOCK_BRACKET);
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
