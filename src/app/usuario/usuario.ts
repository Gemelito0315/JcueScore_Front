import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../auth/services/auth';
import { USUARIO_MENU } from '../core/constants/sidebar.constants';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-usuario',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './usuario.html',
  styleUrl: './usuario.scss'
})
export class Usuario implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);

  currentUser = this.auth.currentUser;
  maintenance = signal(false);
  maintenanceMsg = signal('');
  currentTime = signal('00:00:00');
  avatarUrl = signal<string | null>(localStorage.getItem('avatarUrl'));
  navItems = USUARIO_MENU;
  pageTitle = signal('Panel de Usuario');
  pageSubtitle = signal('Bienvenido de vuelta');
  isMenuOpen = signal(false);

  private clockInterval: any;
  private maintenanceInterval: any;
  private storageListener = () => {
    this.avatarUrl.set(localStorage.getItem('avatarUrl'));
  };

  ngOnInit() {
    this.startClock();
    this.checkMaintenance();
    this.maintenanceInterval = setInterval(() => this.checkMaintenance(), 30000);
    window.addEventListener('storage', this.storageListener);
    window.addEventListener('avatarUpdated', this.storageListener);

    // Título dinámico según ruta activa
    this.updateTitle(this.router.url);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.updateTitle(e.urlAfterRedirects || e.url);
    });
  }

  ngOnDestroy() {
    clearInterval(this.clockInterval);
    clearInterval(this.maintenanceInterval);
    window.removeEventListener('storage', this.storageListener);
    window.removeEventListener('avatarUpdated', this.storageListener);
  }

  startClock() {
    const update = () => {
      const now = new Date();
      this.currentTime.set(
        `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      );
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  }

  checkMaintenance() {
    this.http.get<any>('http://localhost:3000/maintenance').subscribe({
      next: d => { this.maintenance.set(d.active); this.maintenanceMsg.set(d.message); },
      error: () => {}
    });
  }

  updateTitle(url: string) {
    const match = this.navItems.find(item => url.startsWith(item.route));
    if (match) {
      this.pageTitle.set(match.label);
      this.pageSubtitle.set(`Bienvenido, ${this.currentUser()?.name || ''}`);
    } else {
      this.pageTitle.set('Panel de Usuario');
      this.pageSubtitle.set(`Bienvenido de vuelta, ${this.currentUser()?.name || ''}`);
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }
}
