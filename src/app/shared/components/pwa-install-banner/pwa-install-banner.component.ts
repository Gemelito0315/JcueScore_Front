import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaInstallService } from '../../../core/services/pwa-install.service';
import { PushNotificationService } from '../../../core/services/push-notification.service';
import { Auth } from '../../../auth/services/auth';
import { SwPush } from '@angular/service-worker';


@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-install-banner.component.html',
  styleUrl: './pwa-install-banner.component.scss'
})
export class PwaInstallBannerComponent {
  pwaService = inject(PwaInstallService);
  pushService = inject(PushNotificationService);
  auth = inject(Auth);
  private swPush = inject(SwPush);

  showPushPrompt = signal(false); // Inicialmente falso, verificamos luego

  constructor() {
    // Solo mostrar el prompt si el usuario está autenticado, el SW Push está habilitado,
    // y aún no tenemos suscripción activa.
    if (this.auth.isAuthenticated() && this.swPush.isEnabled) {
      this.swPush.subscription.subscribe(sub => {
        // Si no hay suscripción, mostramos el botón
        this.showPushPrompt.set(!sub);
      });
    }
  }

  async pedirPermisosPush() {
    if (!this.auth.isAuthenticated()) return;
    const granted = await this.pushService.requestManualSubscription();
    if (granted) {
      this.showPushPrompt.set(false);
    } else {
      alert('Debes permitir las notificaciones en tu navegador/dispositivo para recibir alertas de partidas.');
    }
  }
}

