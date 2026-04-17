import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface LeaderboardPlayer {
  id: number;
  name: string;
  elo: number;
  winRate: number;
  rank: string;
  club: string;
  avatarUrl?: string;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.html',
  styleUrls: ['./leaderboard.scss']
})
export class Leaderboard implements OnInit {
  private http = inject(HttpClient);
  topPlayers = signal<LeaderboardPlayer[]>([]);

  ngOnInit() {
    this.http.get<any[]>('http://localhost:3000/users/leaderboard').subscribe({
      next: (data) => {
        const mapped = data.map((d: any) => ({
          ...d,
          rank: this.getRankName(d.elo)
        }));
        this.topPlayers.set(mapped);
      },
      error: (err) => console.error('Error fetching leaderboard', err)
    });
  }

  private getRankName(elo: number): string {
    if (elo >= 2200) return 'Diamond';
    if (elo >= 1800) return 'Gold';
    if (elo >= 1400) return 'Silver';
    return 'Bronze';
  }
}
