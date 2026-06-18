import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallBannerComponent } from './shared/components/pwa-install-banner/pwa-install-banner.component';

import { Auth } from './auth/services/auth';
import { PushNotificationService } from './core/services/push-notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaInstallBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('adso_3063267');

  private authService = inject(Auth);
  private pushService = inject(PushNotificationService);

  ngOnInit() {
    // Si el usuario ya está autenticado (restaurado de localStorage), solicitamos/verificamos la suscripción PWA
    if (this.authService.isAuthenticated()) {
      this.pushService.subscribeToNotifications();
    }
  }
}
