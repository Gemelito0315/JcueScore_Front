import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  constructor(private swPush: SwPush, private http: HttpClient) {}

  subscribeToNotifications() {
    if (this.swPush.isEnabled) {
      this.swPush.requestSubscription({
        serverPublicKey: environment.vapidPublicKey
      })
      .then(sub => {
        // Enviar la suscripción al backend
        this.http.post(`${environment.apiBaseUrl}/users/push-subscribe`, sub).subscribe({
          next: () => console.log('[PWA] Suscripción a notificaciones enviada al servidor.'),
          error: err => console.error('[PWA] Error al enviar suscripción:', err)
        });
      })
      .catch(err => console.error('[PWA] No se pudo suscribir a notificaciones', err));
      
      // Escuchar notificaciones (opcional si queremos hacer algo cuando la app está abierta)
      this.swPush.messages.subscribe(message => {
        console.log('[PWA] Notificación recibida:', message);
      });
    }
  }
}
