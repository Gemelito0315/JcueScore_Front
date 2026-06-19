/**
 * sw-push-handler.js
 * Service Worker personalizado que se ejecuta junto al ngsw-worker.js de Angular.
 * Gestiona los clicks en notificaciones push nativas para abrir la URL correcta.
 */

// Escuchar clicks en la notificación nativa del sistema operativo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const targetUrl = data.url || '/usuario/espectador';

  // Si el usuario hace click en "Cerrar", no hacemos nada más
  if (action === 'dismiss') return;

  // Si hace click en "Ver en vivo" o en el cuerpo de la notificación
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Buscar si ya hay una ventana/tab abierta con la app
      const appOrigin = self.location.origin;
      const appClient = clientList.find(
        (c) => c.url.startsWith(appOrigin) && 'focus' in c
      );

      if (appClient) {
        // Si ya hay una ventana abierta, navegar a la URL y hacer focus
        appClient.navigate(targetUrl).then((c) => c && c.focus());
      } else {
        // Si no hay ventana, abrir una nueva
        clients.openWindow(targetUrl);
      }
    })
  );
});

// Escuchar el evento 'push' por si el ngsw-worker no lo captura
// (fallback por compatibilidad)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notification = payload.notification;

    if (!notification) return;

    // Solo mostramos si el ngsw-worker ya NO lo procesó
    // (usamos una clave para evitar duplicados)
    const options = {
      body: notification.body,
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/icon-96x96.png',
      vibrate: notification.vibrate || [100, 50, 100],
      data: notification.data || { url: '/usuario/espectador' },
      actions: notification.actions || [],
      tag: 'partida-en-vivo', // tag único para no acumular notificaciones iguales
      renotify: true,         // vibrar de nuevo incluso si tiene el mismo tag
    };

    // Verificar si el ngsw-worker ya mostró la notificación
    event.waitUntil(
      self.registration.getNotifications({ tag: 'partida-en-vivo' }).then((existing) => {
        // Si ya fue mostrada por el ngsw (tiene el mismo tag), no duplicar
        if (existing.length === 0) {
          return self.registration.showNotification(notification.title, options);
        }
      })
    );
  } catch (e) {
    // Si el payload no es JSON válido, ignorar
    console.warn('[sw-push-handler] Error procesando push event:', e);
  }
});

console.log('[sw-push-handler] Service Worker de push personalizado cargado.');
