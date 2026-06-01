import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PlayerStats {
  name: string;
  lastName: string;
  jcueCoins: number;
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
    jcueCoins: 1250,
    clubName: 'JcueScore Elite'
  };
}
