import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../auth/services/auth';
import { Router } from '@angular/router';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-deudas-usuario',
  imports: [CommonModule],
  templateUrl: './deudas-usuario.html',
  styleUrl: './deudas-usuario.scss'
})
export class DeudasUsuario implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private router = inject(Router);

  deudas = signal<any[]>([]);
  currentUser = this.auth.currentUser;

  esCuentas = computed(() => this.router.url.includes('cuentas'));

  mesasActivas = signal<any[]>([]);
  intervalId: any;
  pollId: any;

  // Recibo modal state
  showRecibo = signal(false);
  reciboActual = signal<any>(null);

  cuentasActivas = computed(() => {
    // Mesas vivas formateadas como deudas
    const mesasComoDeudas = this.mesasActivas().map(m => ({
      id: 'mesa-' + m.id,
      descripcion: `Juego en Curso: ${m.code} (${m.gameType})`,
      estado: 'en_juego',
      monto: m.total || 0,
      montoPagado: 0,
      notas: `Mesa activa. Consumos: $${m.totalConsumos || 0} | Tiempo: $${m.costoTiempo || 0}`,
      fechaCreacion: m.tiempoInicio,
      isLive: true
    }));

    // Las cuentas activas SIEMPRE son las que no están pagadas, sin importar la fecha
    const deudasReales = this.deudas().filter(d => d.estado !== 'pagada');
    
    return [...mesasComoDeudas, ...deudasReales];
  });

  cuentasPagadas = computed(() => {
    const isCuentas = this.esCuentas();
    const todayStr = new Date().toDateString();
    
    // Si estamos en "Cuentas (Hoy)", mostramos el historial de las pagadas HOY.
    // Si estamos en "Historial", mostramos las pagadas en días ANTERIORES.
    return this.deudas().filter(d => {
      if (d.estado !== 'pagada') return false; // Solo pagadas
      const createdToday = new Date(d.fechaPago || d.fechaCreacion).toDateString() === todayStr;
      return isCuentas ? createdToday : !createdToday;
    });
  });

  ngOnInit() {
    const userId = this.currentUser()?.id;
    if (!userId) return;
    
    this.cargarTodo(userId);
    
    // Tick local cada segundo para el reloj
    this.intervalId = setInterval(() => this.tickMesas(), 1000);
    
    // Polling al servidor cada 10 segundos
    this.pollId = setInterval(() => this.cargarTodo(userId), 10000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.pollId) clearInterval(this.pollId);
  }

  cargarTodo(userId: number) {
    this.http.get<any[]>(`${API}/deudas/usuario/${userId}`).subscribe({
      next: d => this.deudas.set(d),
      error: () => this.deudas.set([])
    });
    this.cargarMesasVivas(userId);
  }

  cargarMesasVivas(userId: number) {
    this.http.get<any[]>(`${API}/recursos/todas`).subscribe(todas => {
       const misMesas = todas.filter(m => m.status === 'occupied' && m.jugadoresIds?.includes(userId));
       if(misMesas.length === 0) {
         this.mesasActivas.set([]);
         return;
       }
       
       this.http.get<any[]>(`${API}/pedidos/activos`).subscribe(pedidos => {
          const mesasConDatos = misMesas.map(m => {
             const pedidosMesa = pedidos.filter(p => p.recursoId === m.id && p.estado !== 'entregado');
             const consumos = pedidosMesa.reduce((acc, p) => acc + parseFloat(p.total), 0);
             return {
               ...m,
               totalConsumos: consumos,
               costoTiempo: 0,
               total: consumos
             };
          });
          this.mesasActivas.set(mesasConDatos);
          this.tickMesas(); // Tick inicial inmediato
       });
    });
  }

  tickMesas() {
    this.mesasActivas.update(mesas => mesas.map(m => {
      const diffMs = Date.now() - new Date(m.tiempoInicio).getTime();
      const horas = diffMs / (1000 * 3600);
      const costoTiempo = Math.round(horas * m.pricePerHour);
      return { ...m, costoTiempo, total: m.totalConsumos + costoTiempo };
    }));
  }

  get totalPendiente() {
    return this.cuentasActivas().reduce((a, d) => a + (parseFloat(d.monto) - parseFloat(d.montoPagado)), 0);
  }

  getEstadoColor(estado: string) {
    return { pendiente: '#f87171', parcial: '#f59e0b', pagada: '#10b981', en_juego: '#3b82f6' }[estado] ?? '#64748b';
  }

  getPendiente(d: any) {
    return parseFloat(d.monto) - parseFloat(d.montoPagado);
  }

  abrirRecibo(d: any) {
    this.reciboActual.set(d);
    this.showRecibo.set(true);
  }

  cerrarRecibo() {
    this.showRecibo.set(false);
    this.reciboActual.set(null);
  }
}
