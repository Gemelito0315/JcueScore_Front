import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PlayerStats {
  name: string;
  lastName: string;
  eloRating: number;
  winRate: number;
  jcueCoins: number;
  rank: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  clubName: string;
}

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-card.html',
  styleUrls: ['./player-card.scss']
})
export class PlayerCardComponent {
  @Input() avatarUrl?: string | null;
  @Input() player: PlayerStats = {
    name: 'Juan',
    lastName: 'Pérez',
    eloRating: 2500,
    winRate: 85,
    jcueCoins: 1250,
    rank: 'Diamond',
    clubName: 'JcueScore Elite'
  };
}
