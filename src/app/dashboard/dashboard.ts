import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { Auth } from '../auth/services/auth';

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, OnDestroy {
  private authService = inject(Auth);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  sidebarOpen = signal(true);
  currentTime = signal('00:00:00');
  private clockInterval: any;

  navItems = [
    { label: 'Inicio', icon: 'home', route: '/dashboard/inicio' },
    { label: 'Usuarios', icon: 'users', route: '/dashboard/usuarios' },
    { label: 'Productos', icon: 'box', route: '/dashboard/productos' },
    { label: 'Mesas', icon: 'billar', route: '/dashboard/mesas' },
    { label: 'Sistema', icon: 'settings', route: '/dashboard/sistema' },
  ];

  ngOnInit() {
    const update = () => {
      const now = new Date();
      this.currentTime.set(
        `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      );
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  }

  ngOnDestroy() { clearInterval(this.clockInterval); }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
}
