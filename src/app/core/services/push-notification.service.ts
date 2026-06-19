import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  constructor(private swPush: SwPush, private http: HttpClient) {}

  /**
   * Intenta suscribirse o sincronizar la suscripción existente silenciosamente.
   * NO pide permiso explícito si el usuario no tiene suscripción.
   */
  subscribeToNotifications(retryCount = 0, maxRetries = 5): void {
    if (!this.swPush.isEnabled) {
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => this.subscribeToNotifications(retryCount + 1, maxRetries), delay);
      }
      return;
    }

    // Verificar si ya existe una suscripción activa
    this.swPush.subscription.subscribe({
      next: (existingSub) => {
        if (existingSub) {
          // Ya tiene suscripción — sincronizar con backend
          this.sendSubscriptionToServer(existingSub);
        }
      }
    });

    // Escuchar notificaciones en primer plano
    this.swPush.messages.subscribe(message => {
      console.log('[Push] Notificación recibida en primer plano:', message);
    });
  }

  /**
   * Pide permiso explícito al usuario.
   * DEBE ser invocado por un click del usuario para que el navegador no lo bloquee.
   */
  requestManualSubscription(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.swPush.isEnabled) {
        console.warn('Web Push no habilitado en este navegador.');
        resolve(false);
        return;
      }

      this.swPush.requestSubscription({
        serverPublicKey: environment.vapidPublicKey
      })
      .then(sub => {
        console.log('[Push] Permiso concedido. Enviando suscripción...');
        this.sendSubscriptionToServer(sub);
        resolve(true);
      })
      .catch(err => {
        console.error('[Push] Permiso denegado o error:', err);
        resolve(false);
      });
    });
  }


  private sendSubscriptionToServer(subscription: PushSubscription): void {
    this.http.post(`${environment.apiBaseUrl}/users/push-subscribe`, subscription).subscribe({
      next: () => console.log('[Push] Suscripción registrada en el servidor exitosamente.'),
      error: err => console.error('[Push] Error al enviar suscripción al servidor:', err)
    });
  }
}

