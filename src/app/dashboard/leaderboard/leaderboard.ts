import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface LeaderboardPlayer {
  id: number;
  name: string;
  elo: number;
  winRate: number;
  rank: string;
  club: string;
  jcueCoins?: number;
  avatarUrl?: string;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.html',
  styleUrls: ['./leaderboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Leaderboard implements OnInit {
  private http = inject(HttpClient);

  topPlayers = signal<LeaderboardPlayer[]>([]);
  loading    = signal(true);
  sortBy     = signal<'elo' | 'coins' | 'winrate'>('elo');
  busqueda   = signal('');

  /** Top 3 para el podio visual */
  podium = computed(() =>
    [...this.topPlayers()]
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 3)
  );

  /** Lista filtrada + ordenada según tabs y buscador */
  playersFiltrados = computed(() => {
    const q = this.busqueda().toLowerCase();
    let lista = q
      ? this.topPlayers().filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.club ?? '').toLowerCase().includes(q))
      : [...this.topPlayers()];

    const by = this.sortBy();
    if (by === 'elo')     lista = lista.sort((a, b) => b.elo - a.elo);
    if (by === 'coins')   lista = lista.sort((a, b) => (b.jcueCoins ?? 0) - (a.jcueCoins ?? 0));
    if (by === 'winrate') lista = lista.sort((a, b) => b.winRate - a.winRate);

    return lista;
  });

  ngOnInit() {
    this.http.get<any[]>('http://localhost:3000/users/leaderboard').subscribe({
      next: (data) => {
        const mapped = data.map((d: any) => ({
          id:        d.id,
          name:      `${d.name ?? ''} ${d.lastName ?? ''}`.trim(),
          elo:       d.eloRating ?? d.elo ?? 0,
          winRate:   d.winRate ?? 0,
          rank:      this.getRankName(d.eloRating ?? d.elo ?? 0),
          club:      d.club?.name ?? d.clubName ?? 'Sin club',
          jcueCoins: d.jcueCoins ?? d.loyalty?.coins ?? 0,
          avatarUrl: d.avatarUrl ?? null,
        }));
        this.topPlayers.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching leaderboard', err);
        this.loading.set(false);
      }
    });
  }

  private getRankName(elo: number): string {
    if (elo >= 2200) return 'Diamond';
    if (elo >= 1800) return 'Gold';
    if (elo >= 1400) return 'Silver';
    return 'Bronze';
  }
}
