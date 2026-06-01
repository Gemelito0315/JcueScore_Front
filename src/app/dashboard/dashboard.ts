import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Auth } from '../auth/services/auth';
import { ADMIN_MENU } from '../core/constants/sidebar.constants';
import { filter } from 'rxjs/operators';

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
  pageTitle = signal('Panel Administrativo');
  pageSubtitle = signal('JcueScore · Sistema de gestión');
  private clockInterval: any;

  navItems = ADMIN_MENU;

  ngOnInit() {
    const update = () => {
      const now = new Date();
      this.currentTime.set(
        `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      );
    };
    update();
    this.clockInterval = setInterval(update, 1000);

    // Título dinámico
    this.updateTitle(this.router.url);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.updateTitle(e.urlAfterRedirects || e.url);
    });
  }

  ngOnDestroy() { clearInterval(this.clockInterval); }

  updateTitle(url: string) {
    const match = this.navItems.find(item => url.startsWith(item.route));
    if (match) {
      this.pageTitle.set(match.label);
      this.pageSubtitle.set('Panel Administrativo · JcueScore');
    } else {
      this.pageTitle.set('Panel Administrativo');
      this.pageSubtitle.set('JcueScore · Sistema de gestión');
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
}
