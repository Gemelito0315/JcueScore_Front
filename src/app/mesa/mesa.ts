import { Component, signal, OnInit, OnDestroy, ViewChild, ElementRef, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

export interface Jugada {
  id: number;
  jugador: string;
  puntos: number;
  tiempo: number; // segundos desde inicio
  timestamp: Date;
}

export interface Jugador {
  nombre: string;
  puntos: number;
  meta: number;
  historial: number[];
  promedio: number;
  rachaActual: number;
  rachMax: number;
  eloRating: number;
  rank: string;
  handicap: number;
  jcueCoins: number;
}

@Component({
  selector: 'app-mesa',
  imports: [CommonModule],
  templateUrl: './mesa.html',
  styleUrl: './mesa.scss',
  encapsulation: ViewEncapsulation.None
})
export class Mesa implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('replayEl') replayEl!: ElementRef<HTMLVideoElement>;

  // Config
  mesaId = signal('Mesa 1');
  modalidad = signal('Tres Bandas');
  modalidades = ['Libre', 'Tres Bandas', 'Cinco Pines', 'Carambola', 'Pool 8', 'Pool 9'];
  showConfig = signal(false);
  partidaIniciada = signal(false);
  turnoActual = signal(0);

  // Jugadores
  jugadores = signal<Jugador[]>([
    { nombre: 'Jugador 1', puntos: 0, meta: 50, historial: [], promedio: 0, rachaActual: 0, rachMax: 0, eloRating: 2500, rank: 'Diamond', handicap: 0, jcueCoins: 5000 },
    { nombre: 'Jugador 2', puntos: 0, meta: 50, historial: [], promedio: 0, rachaActual: 0, rachMax: 0, eloRating: 1100, rank: 'Silver', handicap: 15, jcueCoins: 200 },
  ]);

  // Timer
  tiempoSegundos = signal(0);
  timerActivo = signal(false);
  private timerInterval: any;

  // Historial de jugadas
  jugadas = signal<Jugada[]>([]);
  ultimaJugada = signal<Jugada | null>(null);
  private jugadaTimeout: any;

  // Cámara y VAR
  camaraActiva = signal(false);
  camaraError = signal(false);
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  grabaciones = signal<{ id: number; jugada: Jugada; blob: Blob; url: string }[]>([]);

  // VAR Continuo
  private matchRecorder: MediaRecorder | null = null;
  private matchChunks: Blob[] = [];
  varUrl = signal<string | null>(null);
  modoVarCompleto = signal(false);

  // Replay
  modoReplay = signal(false);
  replayUrl = signal<string | null>(null);
  replayJugada = signal<Jugada | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.mesaId.set(decodeURIComponent(id));
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
    clearTimeout(this.jugadaTimeout);
    this.detenerCamara();
  }

  // ── CÁMARA ──────────────────────────────────────────────────
  async iniciarCamara() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      this.camaraActiva.set(true);
      this.camaraError.set(false);
      setTimeout(() => {
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.srcObject = this.stream;
        }
        this.iniciarVarContinuo();
      }, 100);
    } catch {
      this.camaraError.set(true);
      this.camaraActiva.set(false);
    }
  }

  detenerCamara() {
    this.matchRecorder?.stop();
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.camaraActiva.set(false);
  }

  // Activa la grabadora continua
  iniciarVarContinuo() {
    if (!this.stream) return;
    this.matchChunks = [];
    this.matchRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' });
    this.matchRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.matchChunks.push(e.data);
    };
    // Emitir chunks cada 2 segundos (2000ms) para tener el VAR actualizado casi en tiempo real
    this.matchRecorder.start(2000);
  }

  abrirVarCompleto() {
    // Forzamos a la grabadora a soltar los milisegundos de video que tenga cacheados hasta este instante
    // Esto garantiza que el VAR exista y funcione incluso en el primer o segundo '0' de partido.
    if (this.matchRecorder && this.matchRecorder.state === 'recording') {
      this.matchRecorder.requestData();
    }

    // Le damos unos milisegundos a Javascript para que el evento ondataavailable empaquete el Chunk
    setTimeout(() => {
      if (this.matchChunks.length === 0) {
        alert("El V.A.R. se está inicializando. Intenta en un segundo.");
        return;
      }
      const blob = new Blob(this.matchChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      this.varUrl.set(url);
      this.modoVarCompleto.set(true);

      setTimeout(() => {
        const varVideo = document.getElementById('varVideoEl') as HTMLVideoElement;
        if (varVideo) {
          varVideo.src = url;
          // Poner el video cerca del final para ver la última jugada
          varVideo.onloadedmetadata = () => {
            if (varVideo.duration > 1) {
              varVideo.currentTime = varVideo.duration - 1;
            }
          };
        }
      }, 100);
    }, 50);
  }

  cerrarVarCompleto() {
    this.modoVarCompleto.set(false);
    this.varUrl.set(null);
    const varVideo = document.getElementById('varVideoEl') as HTMLVideoElement;
    if (varVideo) {
      varVideo.pause();
      varVideo.src = '';
    }
  }

  iniciarGrabacion() {
    if (!this.stream) return;
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' });
    this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.mediaRecorder.start();
  }

  detenerGrabacion(jugada: Jugada) {
    if (!this.mediaRecorder) return;
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      this.grabaciones.update(g => [...g, { id: jugada.id, jugada, blob, url }]);
    };
    this.mediaRecorder.stop();
  }

  verReplay(jugada: Jugada) {
    const grab = this.grabaciones().find(g => g.id === jugada.id);
    if (grab) {
      this.replayUrl.set(grab.url);
      this.replayJugada.set(jugada);
      this.modoReplay.set(true);
      setTimeout(() => {
        if (this.replayEl?.nativeElement) {
          this.replayEl.nativeElement.src = grab.url;
          this.replayEl.nativeElement.play();
        }
      }, 100);
    }
  }

  cerrarReplay() {
    this.modoReplay.set(false);
    this.replayUrl.set(null);
    this.replayJugada.set(null);
    if (this.replayEl?.nativeElement) {
      this.replayEl.nativeElement.pause();
      this.replayEl.nativeElement.src = '';
    }
  }

  // ── PARTIDA ──────────────────────────────────────────────────
  iniciarPartida() {
    this.jugadores.update(js => {
      const updated = [...js];
      updated[0].puntos = updated[0].handicap;
      updated[1].puntos = updated[1].handicap;
      return updated;
    });
    this.partidaIniciada.set(true);
    this.showConfig.set(false);
    this.iniciarTimer();
    this.iniciarCamara();
  }

  iniciarTimer() {
    this.timerActivo.set(true);
    this.timerInterval = setInterval(() => this.tiempoSegundos.update(t => t + 1), 1000);
  }

  pausarTimer() {
    this.timerActivo.update(v => !v);
    if (this.timerActivo()) {
      this.timerInterval = setInterval(() => this.tiempoSegundos.update(t => t + 1), 1000);
    } else {
      clearInterval(this.timerInterval);
    }
  }

  sumarPuntos(jugadorIdx: number, puntos: number) {
    // Iniciar grabación del clip
    this.iniciarGrabacion();

    this.jugadores.update(js => {
      const updated = [...js];
      const j = { ...updated[jugadorIdx] };
      j.puntos += puntos;
      j.historial = [...j.historial, puntos];
      j.rachaActual = puntos > 0 ? j.rachaActual + puntos : 0;
      if (j.rachaActual > j.rachMax) j.rachMax = j.rachaActual;
      const total = j.historial.reduce((a, b) => a + b, 0);
      j.promedio = j.historial.length > 0 ? Math.round((total / j.historial.length) * 10) / 10 : 0;
      updated[jugadorIdx] = j;
      return updated;
    });

    const jugada: Jugada = {
      id: Date.now(),
      jugador: this.jugadores()[jugadorIdx].nombre,
      puntos,
      tiempo: this.tiempoSegundos(),
      timestamp: new Date()
    };

    this.jugadas.update(j => [jugada, ...j]);
    this.ultimaJugada.set(jugada);
    clearTimeout(this.jugadaTimeout);
    this.jugadaTimeout = setTimeout(() => this.ultimaJugada.set(null), 3000);

    // Detener grabación después de 5 segundos
    setTimeout(() => this.detenerGrabacion(jugada), 5000);

    this.turnoActual.set(jugadorIdx === 0 ? 1 : 0);
  }

  restarPuntos(jugadorIdx: number) {
    this.jugadores.update(js => {
      const updated = [...js];
      const j = { ...updated[jugadorIdx] };
      if (j.puntos > 0) j.puntos--;
      updated[jugadorIdx] = j;
      return updated;
    });
  }

  resetPartida() {
    if (!confirm('¿Reiniciar la partida?')) return;
    clearInterval(this.timerInterval);
    this.tiempoSegundos.set(0);
    this.timerActivo.set(false);
    this.partidaIniciada.set(false);
    this.turnoActual.set(0);
    this.jugadas.set([]);
    this.grabaciones.set([]);
    this.jugadores.update(js => js.map(j => ({
      ...j, puntos: j.handicap, historial: [], promedio: 0, rachaActual: 0, rachMax: 0
    })));
  }

  get tiempoFormateado() {
    const t = this.tiempoSegundos();
    const h = Math.floor(t / 3600).toString().padStart(2, '0');
    const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
    const s = (t % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  tiempoJugada(seg: number) {
    const m = Math.floor(seg / 60).toString().padStart(2, '0');
    const s = (seg % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get ganador() {
    return this.jugadores().find(j => j.puntos >= j.meta) ?? null;
  }

  setMeta(meta: number) {
    this.jugadores.update(js => js.map(j => ({ ...j, meta })));
  }

  setNombre(idx: number, nombre: string) {
    this.jugadores.update(js => {
      const updated = [...js];
      updated[idx] = { ...updated[idx], nombre };
      return updated;
    });
  }

  tieneReplay(jugada: Jugada) {
    return this.grabaciones().some(g => g.id === jugada.id);
  }
}
