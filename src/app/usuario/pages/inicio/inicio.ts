import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlayerCardComponent } from '../../player-card/player-card';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../auth/services/auth';

@Component({
  selector: 'app-usuario-inicio',
  imports: [RouterLink, PlayerCardComponent],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class UsuarioInicio implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  // Stats genéricas
  historialJuegos = signal(12);
  rachaActual = signal(3);
  puntos = signal(450);

  // Hook de lealtad Geo-fencing
  statusGPS = signal<'Buscando' | 'Conectado' | 'Fuera'>('Buscando');
  jcueCoins = signal(1250);
  avatarUrl = signal<string | null>('https://i.pravatar.cc/150?img=12'); // Foto de perfil simulada
  miningInterval: any;
  gpsInterval: any;

  ngOnInit() {
    this.iniciarHookLealtad();
  }

  ngOnDestroy() {
    clearInterval(this.miningInterval);
    clearTimeout(this.gpsInterval);
  }

  iniciarHookLealtad() {
    // Simulamos que el dispositivo está escaneando la Red Wi-fi o el GPS
    this.statusGPS.set('Buscando');
    
    this.gpsInterval = setTimeout(() => {
      // Éxito: El usuario está dentro del Billar
      this.statusGPS.set('Conectado');
      
      // Farmeo dinámico sincronizado con POST a NestJS
      this.miningInterval = setInterval(() => {
        const userId = this.auth.currentUser()?.id;
        if (!userId) return;

        // Sumamos a UI estéticamente
        this.jcueCoins.update(c => c + 1);
        this.puntos.update(p => p + 10);

        // Guardamos en Base de Datos
        this.http.post(`http://localhost:3000/users/${userId}/mine-loyalty`, {
          coins: 1,
          minutes: 1
        }).subscribe({
          error: (err) => console.log('Sincronización Coins fallida', err)
        });

      }, 60000); // 1 minuto real (era 5 seg para el demo visual)
    }, 3000);
  }
}
