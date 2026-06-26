import { Component, signal, OnInit, OnDestroy, ViewChild, ElementRef, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { WebsocketsService } from '../core/services/websockets.service';
import { environment } from '../../environments/environment';

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
  private ws = inject(WebsocketsService);
  private location = inject(Location);
  private http = inject(HttpClient);

  isViewer = signal(false);
  private syncSub: any;

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('replayEl') replayEl!: ElementRef<HTMLVideoElement>;

  // Config & Wizard
  wizardStep = signal(1);
  tipoJuego = signal<'facil' | 'avanzado' | 'pool'>('facil');
  numJugadores = signal(2);
  limiteEntradasConfig = signal(50);
  metaCarambolasConfig = signal(50);

  // === SHOPPING CART / TIENDA ===
  productos = signal<any[]>([]);
  mostrarTienda = signal(false);
  carritoTienda = signal<{producto: any, cantidad: number}[]>([]);

  mesaId = signal('Mesa 1');
  modalidad = signal('Tres Bandas');
  modalidades = ['Libre', 'Tres Bandas', 'Cinco Pines', 'Carambola', 'Pool 8', 'Pool 9'];
  puntosArray = [1, 2, 3, 4, 5];
  showConfig = signal(false);
  partidaIniciada = signal(false);
  turnoActual = signal(0);

  // Jugadores
  jugadores = signal<Jugador[]>([
    { nombre: 'Jugador 1', puntos: 0, meta: 50, historial: [], promedio: 0, rachaActual: 0, rachMax: 0, handicap: 0, jcueCoins: 5000 },
    { nombre: 'Jugador 2', puntos: 0, meta: 50, historial: [], promedio: 0, rachaActual: 0, rachMax: 0, handicap: 15, jcueCoins: 200 },
  ]);

  actualizarNumJugadores(num: number) {
    this.numJugadores.set(num);
    const current = this.jugadores();
    const nuevos: Jugador[] = [];
    for (let i = 0; i < num; i++) {
      if (i < current.length) {
        nuevos.push(current[i]);
      } else {
        nuevos.push({ nombre: `Jugador ${i + 1}`, puntos: 0, meta: this.metaCarambolasConfig(), historial: [], promedio: 0, rachaActual: 0, rachMax: 0, handicap: 0, jcueCoins: 0 });
      }
    }
    this.jugadores.set(nuevos);
  }

  siguientePaso() {
    const step = this.wizardStep();
    if (step === 1) {
      if (this.tipoJuego() === 'avanzado') this.wizardStep.set(2);
      else this.wizardStep.set(3);
    } else if (step === 2) {
      this.wizardStep.set(3);
    } else if (step === 3) {
      this.wizardStep.set(4);
    }
  }

  pasoAnterior() {
    const step = this.wizardStep();
    if (step === 4) this.wizardStep.set(3);
    else if (step === 3) {
      if (this.tipoJuego() === 'avanzado') this.wizardStep.set(2);
      else this.wizardStep.set(1);
    } else if (step === 2) {
      this.wizardStep.set(1);
    }
  }

  // Timer
  tiempoSegundos = signal(0);
  timerActivo = signal(false);
  private timerInterval: any;
  private broadcastInterval: any;
  liveFrame = signal<string | null>(null);

  // Configuración de tiro (modo avanzado)
  tiempoEntrada = signal(40);        // duración configurable 30/40/50
  entradaActual = signal(1);          // contador de entradas (innings)
  tiempoTiro = signal(40);            // countdown del tiro actual
  private tiroInterval: any;

  // Cierre de cuenta
  cuentaPendiente = signal(false);
  mostrarConsumo = signal(false);
  private cuentaSub: any;

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
  isFullscreen = signal(false);

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
    if (id) {
      const decoded = decodeURIComponent(id);
      const match = decoded.match(/\d+/);
      const numericId = match ? match[0] : decoded;
      this.mesaId.set(numericId);
    }

    this.route.queryParams.subscribe(params => {
      setTimeout(() => {
        const modeParam = params['mode'] || this.route.snapshot.queryParamMap.get('mode');
        this.isViewer.set(modeParam === 'viewer');
        
        // Siempre intentamos unirnos a la sala WebSocket para escuchar/sincronizar
        // Si somos viewer, nos sincronizaremos siempre. Si somos tablet, recuperaremos el estado si se refrescó.
        const joinMatch = () => {
          if (this.ws.connectionStatus() === 'conectado') {
            this.ws.send({ type: 'join_match', mesaId: this.mesaId() });
          } else {
            const interval = setInterval(() => {
              if (this.ws.connectionStatus() === 'conectado') {
                this.ws.send({ type: 'join_match', mesaId: this.mesaId() });
                clearInterval(interval);
              }
            }, 500);
            setTimeout(() => clearInterval(interval), 10000);
          }
        };

        if (this.isViewer()) {
          this.partidaIniciada.set(true);
        }
        
        joinMatch();
      });
    });

    this.syncSub = this.ws.onMatchUpdate().subscribe((data) => {
      if (data.mesaId === this.mesaId()) {
        if (data.type === 'cerrar_cuenta') {
          // Garitero liberó la mesa
          this.cuentaPendiente.set(false);
          this.mostrarConsumo.set(false);
          this.resetPartida();
        } else {
          this.syncState(data.state);
        }
      }
    });

    this.cargarProductos();
  }

  syncState(state: any) {
    if (state) {
      // Sincronizar si somos viewer, O si somos tablet y estamos recuperando estado (tras F5)
      if (this.isViewer() || (!this.isViewer() && !this.partidaIniciada() && state.partidaIniciada)) {
        if (state.jugadores && Array.isArray(state.jugadores)) {
          const mapped = state.jugadores.map((j: any, idx: number) => {
            const current = this.jugadores()[idx] || {};
            return {
              nombre: j.nombre || current.nombre || `Jugador ${idx + 1}`,
              puntos: j.puntos !== undefined ? j.puntos : (current.puntos || 0),
              meta: j.meta !== undefined ? j.meta : (current.meta || 50),
              historial: j.historial || current.historial || [],
              promedio: j.promedio !== undefined ? j.promedio : (current.promedio || 0),
              rachaActual: j.rachaActual !== undefined ? j.rachaActual : (current.rachaActual || 0),
              rachMax: j.rachMax !== undefined ? j.rachMax : (current.rachMax || 0),
              handicap: j.handicap !== undefined ? j.handicap : (current.handicap || 0),
              jcueCoins: j.jcueCoins !== undefined ? j.jcueCoins : (current.jcueCoins || 0)
            };
          });
          this.jugadores.set(mapped);
        } else {
          this.jugadores.set(state.jugadores);
        }

        this.tiempoSegundos.set(state.tiempoSegundos || 0);
        this.timerActivo.set(state.timerActivo || false);
        this.turnoActual.set(state.turnoActual || 0);
        this.jugadas.set(state.jugadas || []);
        this.partidaIniciada.set(true);
        this.showConfig.set(false);
        
        if (state.frame && this.isViewer()) {
          this.liveFrame.set(state.frame);
        }
        
        clearInterval(this.timerInterval);
        if (state.timerActivo) {
          this.timerInterval = setInterval(() => this.tiempoSegundos.update(t => t + 1), 1000);
        }

        // Si somos tablet recuperando estado, reiniciar cámara y broadcast
        if (!this.isViewer()) {
          this.iniciarCamara();
          clearInterval(this.broadcastInterval);
          this.broadcastInterval = setInterval(() => this.broadcastState(), 1500);
        }
      }
    }
  }

  broadcastState() {
    if (this.isViewer()) return;

    let frame = null;
    if (this.camaraActiva() && this.videoEl?.nativeElement) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(this.videoEl.nativeElement, 0, 0, canvas.width, canvas.height);
          frame = canvas.toDataURL('image/jpeg', 0.4);
        }
      } catch (e) {
        console.error('Error capturing frame', e);
      }
    }

    this.ws.send({
      type: 'match_update',
      mesaId: this.mesaId(),
      state: {
        jugadores: this.jugadores(),
        tiempoSegundos: this.tiempoSegundos(),
        timerActivo: this.timerActivo(),
        turnoActual: this.turnoActual(),
        jugadas: this.jugadas(),
        partidaIniciada: this.partidaIniciada(),
        frame: frame
      }
    });
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
    clearInterval(this.broadcastInterval);
    clearInterval(this.tiroInterval);
    clearTimeout(this.jugadaTimeout);
    this.detenerCamara();
    if (this.syncSub) this.syncSub.unsubscribe();
    if (this.cuentaSub) this.cuentaSub.unsubscribe();
  }

  // ── CÁMARA ──────────────────────────────────────────────────
  async iniciarCamara() {
    try {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (err) {
        console.warn('Failing to getUserMedia with ideal constraints, trying fallback video: true', err);
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      this.camaraActiva.set(true);
      this.camaraError.set(false);
      
      const checkInterval = setInterval(() => {
        if (this.videoEl?.nativeElement) {
          const video = this.videoEl.nativeElement;
          video.srcObject = this.stream;
          video.play().catch(e => console.error('Error in video.play():', e));
          this.iniciarVarContinuo();
          clearInterval(checkInterval);
        }
      }, 50);
      
      // Stop checking after 2 seconds to avoid infinite loop if something fails
      setTimeout(() => clearInterval(checkInterval), 2000);
    } catch (e) {
      console.error('Error starting camera even with fallback:', e);
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

  toggleFullscreenCamera() {
    this.isFullscreen.update(v => !v);
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
    if (this.cuentaPendiente()) {
      alert('Debe cerrar la cuenta pendiente antes de iniciar una nueva partida.');
      return;
    }
    this.jugadores.update(js => {
      const updated = [...js];
      updated.forEach(j => j.puntos = j.handicap || 0);
      return updated;
    });
    this.partidaIniciada.set(true);
    this.showConfig.set(false);
    this.entradaActual.set(1);
    this.tiempoTiro.set(this.tiempoEntrada());
    this.iniciarTimer();
    this.iniciarTiroTimer();
    this.iniciarCamara();
    this.broadcastState();

    // Notificar al backend para que dispare push a todos los usuarios suscritos
    const js = this.jugadores();
    this.http.post(`${environment.apiBaseUrl}/partidas/notify-live`, {
      mesaId: this.mesaId(),
      jugador1: js[0]?.nombre || 'Jugador 1',
      jugador2: js[1]?.nombre !== 'Jugador 2' ? js[1]?.nombre : undefined,
    }).subscribe({
      next: () => console.log('[Push] Notificación de partida en vivo enviada.'),
      error: err => console.warn('[Push] No se pudo enviar notificación de partida en vivo:', err),
    });
  }

  // ── TIRO TIMER (countdown por entrada) ─────────────────────
  iniciarTiroTimer() {
    clearInterval(this.tiroInterval);
    this.tiempoTiro.set(this.tiempoEntrada());
    this.tiroInterval = setInterval(() => {
      this.tiempoTiro.update(t => {
        if (t <= 1) {
          // Se acabó el tiempo del tiro → resetear y avanzar turno
          this.resetTiroTimer();
          return this.tiempoEntrada();
        }
        return t - 1;
      });
    }, 1000);
  }

  resetTiroTimer() {
    this.tiempoTiro.set(this.tiempoEntrada());
  }

  cargarProductos() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/productos`).subscribe({
      next: p => this.productos.set(p.filter(x => x.isActive && x.stock > 0)),
      error: () => {}
    });
  }

  pausarTiroTimer() {
    clearInterval(this.tiroInterval);
  }

  reanudarTiroTimer() {
    this.iniciarTiroTimer();
  }

  iniciarTimer() {
    this.timerActivo.set(true);
    this.timerInterval = setInterval(() => this.tiempoSegundos.update(t => t + 1), 1000);
    // Broadcast state every 1.5 seconds to ensure backend activeMatches is populated and send frames
    if (!this.isViewer()) {
      this.broadcastInterval = setInterval(() => this.broadcastState(), 1500);
    }
  }

  pausarTimer() {
    this.timerActivo.update(v => !v);
    if (this.timerActivo()) {
      this.timerInterval = setInterval(() => this.tiempoSegundos.update(t => t + 1), 1000);
    } else {
      clearInterval(this.timerInterval);
    }
    this.broadcastState();
  }

  sumarPuntos(jugadorIdx: number, puntos: number) {
    this.sumarPuntosConValor(jugadorIdx, puntos);
  }

  // Método principal para sumar puntos (usado por botones +2, +3, +5 y click en score +1)
  sumarPuntosConValor(jugadorIdx: number, puntos: number) {
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

    // Cambiar turno y resetear timer de tiro
    this.turnoActual.set((jugadorIdx + 1) % this.numJugadores());
    this.entradaActual.update(e => e + 1);
    this.resetTiroTimer();
    this.broadcastState();
  }

  // Restar exactamente 1 punto
  restarPunto(jugadorIdx: number) {
    this.jugadores.update(js => {
      const updated = [...js];
      const j = { ...updated[jugadorIdx] };
      if (j.puntos > 0) j.puntos--;
      updated[jugadorIdx] = j;
      return updated;
    });
    this.broadcastState();
  }

  restarPuntos(jugadorIdx: number) {
    this.restarPunto(jugadorIdx);
  }

  // ── CIERRE DE CUENTA ──────────────────────────────────────────
  cerrarTiempoYPedirCuenta() {
    // Pausar todo
    this.timerActivo.set(false);
    clearInterval(this.timerInterval);
    this.pausarTiroTimer();

    // Marcar como cuenta pendiente
    this.cuentaPendiente.set(true);
    this.mostrarConsumo.set(true);

    // Notificar al garitero vía WebSocket
    this.ws.send({
      type: 'solicitar_cuenta',
      mesaId: this.mesaId(),
      datos: {
        jugadores: this.jugadores(),
        tiempoTotal: this.tiempoSegundos(),
        entradas: this.entradaActual(),
        jugadas: this.jugadas()
      }
    });
  }

  cerrarModalConsumo() {
    // Solo ocultar modal, pero la mesa sigue bloqueada hasta que el garitero libere
    this.mostrarConsumo.set(false);
  }

  // --- LOGICA DE LA TIENDA (CARRITO) ---
  toggleTienda() {
    this.mostrarTienda.set(!this.mostrarTienda());
  }

  agregarAlCarrito(producto: any) {
    this.carritoTienda.update(c => {
      const existing = c.find(item => item.producto.id === producto.id);
      if (existing) {
        existing.cantidad++;
      } else {
        c.push({ producto, cantidad: 1 });
      }
      return [...c];
    });
  }

  quitarDelCarrito(productoId: number) {
    this.carritoTienda.update(c => {
      const existing = c.find(item => item.producto.id === productoId);
      if (existing) {
        existing.cantidad--;
        if (existing.cantidad <= 0) {
          return c.filter(item => item.producto.id !== productoId);
        }
      }
      return [...c];
    });
  }

  get totalCarrito() {
    return this.carritoTienda().reduce((acc, item) => acc + (item.producto.price * item.cantidad), 0);
  }

  enviarPedidoMesa() {
    if (this.carritoTienda().length === 0) return;

    // Extraer solo el número de la mesa si el ID tiene texto extra
    const numeroMesa = parseInt(this.mesaId().replace(/\D/g, '')) || 1;

    const payload = {
      recursoId: numeroMesa,
      metodoPago: 'cuenta_mesa',
      metadata: { origen: 'mesa' },
      items: this.carritoTienda().map(item => ({
        productId: item.producto.id,
        cantidad: item.cantidad
      }))
    };

    this.http.post(`${environment.apiBaseUrl}/pedidos/mesa`, payload).subscribe({
      next: () => {
        alert('✅ ¡Pedido enviado a la barra! Te lo llevaremos pronto.');
        this.carritoTienda.set([]);
        this.mostrarTienda.set(false);
      },
      error: (err) => {
        let msg = 'Asegúrate de estar conectado a internet.';
        if (err.error && err.error.message) {
          msg = typeof err.error.message === 'string' ? err.error.message : JSON.stringify(err.error.message);
        }
        alert(`Error al enviar el pedido: ${msg}`);
      }
    });
  }

  resetPartida() {
    if (!this.cuentaPendiente() && !confirm('¿Reiniciar la partida?')) return;
    clearInterval(this.timerInterval);
    clearInterval(this.broadcastInterval);
    clearInterval(this.tiroInterval);
    this.tiempoSegundos.set(0);
    this.timerActivo.set(false);
    this.partidaIniciada.set(false);
    this.turnoActual.set(0);
    this.entradaActual.set(1);
    this.tiempoTiro.set(this.tiempoEntrada());
    this.jugadas.set([]);
    this.grabaciones.set([]);
    this.cuentaPendiente.set(false);
    this.mostrarConsumo.set(false);
    this.jugadores.update(js => js.map(j => ({
      ...j, puntos: j.handicap, historial: [], promedio: 0, rachaActual: 0, rachMax: 0
    })));
    this.broadcastState();
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

  volverLobby() {
    this.location.back();
  }
}
