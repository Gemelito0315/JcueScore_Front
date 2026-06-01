import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../auth/services/auth';
import { GARITERO_MENU } from '../core/constants/sidebar.constants';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-garitero',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './garitero.html',
  styleUrl: './garitero.scss'
})
export class Garitero implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);

  currentUser = this.auth.currentUser;
  currentTime = signal('00:00:00');
  navItems = GARITERO_MENU;
  isMenuOpen = signal(false);
  llamadosCount = signal(0);
  private clockInterval: any;
  private pollingInterval: any;

  showTrilla = signal(false);
  loadingTrilla = signal(false);
  resumenTrilla = signal<any>(null);

  ngOnInit() {
    const update = () => {
      const now = new Date();
      this.currentTime.set(
        `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      );
    };
    update();
    this.clockInterval = setInterval(update, 1000);

    const pollLlamados = () => {
      this.http.get<any[]>('http://localhost:3000/operaciones/llamados/activos').subscribe({
        next: (res) => this.llamadosCount.set(res.length),
        error: () => {}
      });
    };
    pollLlamados();
    this.pollingInterval = setInterval(pollLlamados, 5000); // Check every 5s for fast response
  }

  ngOnDestroy() { 
    clearInterval(this.clockInterval); 
    clearInterval(this.pollingInterval);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  abrirTrilla() {
    this.showTrilla.set(true);
    this.loadingTrilla.set(true);
    // Find active turn
    this.http.get<any[]>('http://localhost:3000/operaciones/turno/abiertos').subscribe({
      next: (turnos) => {
        if (turnos && turnos.length > 0) {
          const tId = turnos[0].id;
          this.http.get<any>(`http://localhost:3000/operaciones/turno/${tId}/reporte-detallado`).subscribe({
            next: (res) => {
              this.resumenTrilla.set(res);
              this.loadingTrilla.set(false);
            },
            error: () => this.loadingTrilla.set(false)
          });
        } else {
          this.resumenTrilla.set(null); // No active turn
          this.loadingTrilla.set(false);
        }
      },
      error: () => this.loadingTrilla.set(false)
    });
  }

  cerrarTrilla() {
    this.showTrilla.set(false);
  }
}
