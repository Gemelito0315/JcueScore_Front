import { Injectable, signal } from '@angular/core';

export type GeoStatus = 'Buscando' | 'Conectado' | 'Fuera' | 'Denegado' | 'No Soportado';

@Injectable({
  providedIn: 'root'
})
export class GeoService {
  // Señales reactivas
  public status = signal<GeoStatus>('Buscando');
  public distanceMeters = signal<number | null>(null);
  public isInsideVenue = signal<boolean>(false);
  public userCoords = signal<{ lat: number, lng: number } | null>(null);

  // Coordenadas del local
  // Para pruebas según requerimiento, usaremos un radio grande (5km) o asignaremos la ubicación del PC.
  private venueCoords: { lat: number, lng: number } | null = null;
  private readonly MAX_DISTANCE_METERS = 5000; // 5 km de tolerancia para pruebas

  private watchId: number | null = null;

  constructor() {
    this.iniciarRastreo();
  }

  public iniciarRastreo() {
    if (!('geolocation' in navigator)) {
      this.status.set('No Soportado');
      return;
    }

    this.status.set('Buscando');

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.userCoords.set({ lat: latitude, lng: longitude });

        // MODO PRUEBA: Si no tenemos coords del local, asumimos que el local está exactamente donde el usuario inició
        if (!this.venueCoords) {
          this.venueCoords = { lat: latitude, lng: longitude };
        }

        const distance = this.calcularDistanciaMts(latitude, longitude, this.venueCoords.lat, this.venueCoords.lng);
        this.distanceMeters.set(Math.round(distance));

        if (distance <= this.MAX_DISTANCE_METERS) {
          this.status.set('Conectado');
          this.isInsideVenue.set(true);
        } else {
          this.status.set('Fuera');
          this.isInsideVenue.set(false);
        }
      },
      (error) => {
        console.error('Error GEO:', error);
        if (error.code === error.PERMISSION_DENIED) {
          this.status.set('Denegado');
        } else {
          this.status.set('Fuera'); // Error técnico, asumimos fuera
        }
        this.isInsideVenue.set(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000
      }
    );
  }

  public detenerRastreo() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Fórmula de Haversine para calcular distancia en metros entre dos coordenadas
  private calcularDistanciaMts(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la tierra en metros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
