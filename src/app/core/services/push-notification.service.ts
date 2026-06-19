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
   * Intenta suscribir al usuario a notificaciones push.
   * Espera a que el Service Worker esté activo (hasta maxRetries intentos).
   * No pide permiso si el usuario ya tiene una suscripción válida.
   */
  subscribeToNotifications(retryCount = 0, maxRetries = 5): void {
    // El SW puede no estar listo aún (especialmente en primer login)
    if (!this.swPush.isEnabled) {
      if (retryCount < maxRetries) {
        // Reintento exponencial: 1s, 2s, 4s, 8s, 16s
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[Push] SW no disponible. Reintento ${retryCount + 1}/${maxRetries} en ${delay}ms...`);
        setTimeout(() => this.subscribeToNotifications(retryCount + 1, maxRetries), delay);
      } else {
        console.warn('[Push] Service Worker no disponible después de múltiples intentos. Notificaciones push no activadas.');
      }
      return;
    }

    // Verificar si ya existe una suscripción activa para no mostrar el diálogo de nuevo
    this.swPush.subscription.subscribe({
      next: (existingSub) => {
        if (existingSub) {
          // Ya tiene suscripción — solo reenviar al backend por si cambió
          console.log('[Push] Suscripción existente encontrada. Sincronizando con backend...');
          this.sendSubscriptionToServer(existingSub);
        } else {
          // No tiene suscripción — pedir permisos al usuario
          this.requestNewSubscription();
        }
      },
      error: () => {
        // Si falla leer la suscripción actual, intentar crear una nueva igualmente
        this.requestNewSubscription();
      }
    });

    // Escuchar notificaciones cuando la app está abierta en primer plano
    this.swPush.messages.subscribe(message => {
      console.log('[Push] Notificación recibida en primer plano:', message);
    });
  }

  private requestNewSubscription(): void {
    this.swPush.requestSubscription({
      serverPublicKey: environment.vapidPublicKey
    })
    .then(sub => {
      console.log('[Push] Permiso concedido. Enviando suscripción al servidor...');
      this.sendSubscriptionToServer(sub);
    })
    .catch(err => {
      if (err?.name === 'NotAllowedError') {
        console.warn('[Push] El usuario denegó el permiso de notificaciones.');
      } else {
        console.error('[Push] No se pudo suscribir a notificaciones:', err);
      }
    });
  }

  private sendSubscriptionToServer(subscription: PushSubscription): void {
    this.http.post(`${environment.apiBaseUrl}/users/push-subscribe`, subscription).subscribe({
      next: () => console.log('[Push] Suscripción registrada en el servidor exitosamente.'),
      error: err => console.error('[Push] Error al enviar suscripción al servidor:', err)
    });
  }
}
