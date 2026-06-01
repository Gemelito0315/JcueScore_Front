import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../auth/services/auth';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mi-partida-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './mi-partida.page.html',
  styleUrls: ['./mi-partida.page.scss']
})
export class MiPartidaPage implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private router = inject(Router);

  partidaActiva = signal<any | null>(null);
  cronometroActivo = signal<string>('00:00:00');
  costoAcumulado = signal<number>(0);
  loading = signal(true);

  // Modal de llamado al garitero
  showLlamadoModal = signal(false);
  mensajeLlamado = signal('');
  enviandoLlamado = signal(false);
  llamadoEnviado = signal(false);

  opcionesRapidas = [
    { label: '🧢 Tiza / Accesorios', value: 'Necesito tiza y accesorios' },
    { label: '🍺 Pedir Bebida', value: 'Quiero pedir una bebida' },
    { label: '🍔 Pedir Comida', value: 'Quiero pedir comida' },
    { label: '💰 Pedir la Cuenta', value: 'Quiero pedir la cuenta' },
    { label: '🔧 Problema con la Mesa', value: 'Tengo un problema con la mesa' },
  ];

  private dataPollingInterval: any;
  private liveClockInterval: any;

  ngOnInit() {
    this.cargarPartidaActiva();
    this.dataPollingInterval = setInterval(() => this.cargarPartidaActiva(), 5000);
    this.liveClockInterval = setInterval(() => this.tickCronometro(), 1000);
  }

  ngOnDestroy() {
    if (this.dataPollingInterval) clearInterval(this.dataPollingInterval);
    if (this.liveClockInterval) clearInterval(this.liveClockInterval);
  }

  cargarPartidaActiva() {
    this.http.get<any>(`http://localhost:3000/partidas/me/activa`).subscribe({
      next: (partida) => {
        this.partidaActiva.set(partida);
        this.loading.set(false);
        this.tickCronometro();
      },
      error: () => {
        this.partidaActiva.set(null);
        this.loading.set(false);
      }
    });
  }

  tickCronometro() {
    const partida = this.partidaActiva();
    if (!partida) return;

    const diffMs = Date.now() - new Date(partida.horaInicio).getTime();
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));

    const h = Math.floor(diffSecs / 3600).toString().padStart(2, '0');
    const m = Math.floor((diffSecs % 3600) / 60).toString().padStart(2, '0');
    const s = (diffSecs % 60).toString().padStart(2, '0');

    this.cronometroActivo.set(`${h}:${m}:${s}`);

    const precioHora = parseFloat(partida.recursoPricePerHour || 15000);
    const horasTranscurridas = diffSecs / 3600;
    this.costoAcumulado.set(Math.round(horasTranscurridas * precioHora));
  }

  abrirModalLlamado() {
    this.mensajeLlamado.set('');
    this.llamadoEnviado.set(false);
    this.showLlamadoModal.set(true);
  }

  seleccionarOpcionRapida(valor: string) {
    this.mensajeLlamado.set(valor);
  }

  enviarLlamado() {
    const partida = this.partidaActiva();
    if (!partida || !this.mensajeLlamado().trim()) return;

    this.enviandoLlamado.set(true);
    this.http.post(`http://localhost:3000/operaciones/llamados/crear`, {
      recursoId: partida.recursoId,
      mensaje: this.mensajeLlamado().trim()
    }).subscribe({
      next: () => {
        this.enviandoLlamado.set(false);
        this.llamadoEnviado.set(true);
        setTimeout(() => {
          this.showLlamadoModal.set(false);
          this.llamadoEnviado.set(false);
        }, 2500);
      },
      error: () => {
        this.enviandoLlamado.set(false);
        alert('Error al enviar el llamado. Inténtalo de nuevo.');
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(value || 0);
  }
}
