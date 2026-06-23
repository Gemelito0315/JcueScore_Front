import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:3000';

export interface CuentaActiva {
  id: string; // "mesa-X" o "usuario-Y"
  tipo: 'mesa' | 'cliente';
  nombre: string; // "Mesa 1" o "Julián Medina"
  recursoId?: number;
  usuarioId?: number;
  partidaId?: number;
  jugadores?: string[];
  jugadoresIds?: number[];
  tiempoInicio?: Date;
  precioHora?: number;
  pedidos: any[];
  totalConsumo: number;
  totalMesa: number;
  totalGeneral: number;
  llamadoAyuda?: boolean;
  llamadoId?: number;
  nuevoPedidoPendiente?: boolean;
  status?: string;
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrl: './ventas.scss'
})
export class Ventas implements OnInit, OnDestroy {
  private http = inject(HttpClient);

  // Datos base de la API
  productos = signal<any[]>([]);
  recursosActivos = signal<any[]>([]);
  pedidosActivos = signal<any[]>([]);
  llamadosActivos = signal<any[]>([]);
  ventasDelDia = signal<any[]>([]);
  usuarios = signal<any[]>([]);
  deudasActivas = signal<any[]>([]);

  // Interfaz de Usuario
  activeTab = signal<'cuentas' | 'barra' | 'cuentas_cobrar'>('cuentas');
  filtroBusqueda = signal('');
  selectedCuenta = signal<CuentaActiva | null>(null);
  selectedCuentaDetail = computed(() => {
    const sel = this.selectedCuenta();
    if (!sel) return null;
    return this.cuentasActivas().find(c => c.id === sel.id) || sel;
  });
  carritoBarra = signal<any[]>([]);
  metodoPagoBarra = signal<'efectivo' | 'transferencia' | 'deuda'>('efectivo');

  // Para venta rápida en barra cuando el método es 'deuda'
  barraQuienPaga = signal<'registrado' | 'cliente_nuevo'>('registrado');
  barraUsuarioRegistradoId = signal<number | null>(null);
  barraNombreClienteOcasional = signal<string>('');

  // Para agregar consumo a cuentas
  mostrandoAgregarProductos = signal(false);
  cuentaParaAgregar = signal<CuentaActiva | null>(null);
  carritoAgregar = signal<any[]>([]);

  // --- MANUAL START & CHECKOUT WIZARD FIELDS ---
  mostrandoIniciarMesaManual = signal(false);
  mesaParaIniciar = signal<any | null>(null);
  manualJugador1Tipo = signal<'registrado' | 'ocasional'>('registrado');
  manualJugador1Registrado = signal<number | null>(null);
  manualJugador1NombreOcasional = signal<string>('');
  
  manualJugador2Tipo = signal<'registrado' | 'ocasional'>('registrado');
  manualJugador2Registrado = signal<number | null>(null);
  manualJugador2NombreOcasional = signal<string>('');

  mostrandoFinalizarMesaCobro = signal(false);
  mesaParaFinalizar = signal<CuentaActiva | null>(null);
  checkoutQuienPaga = signal<'j1' | 'j2' | 'otro_registrado' | 'cliente_nuevo'>('j1');
  checkoutOtroUsuarioId = signal<number | null>(null);
  checkoutNombreClienteOcasional = signal<string>('');
  checkoutMetodoPago = signal<'efectivo' | 'transferencia' | 'deuda'>('efectivo');
  checkoutNotas = signal<string>('');
  checkoutEfectivoRecibido = signal<number | null>(null);

  checkoutVueltas = computed(() => {
    const recibido = this.checkoutEfectivoRecibido();
    const mesa = this.mesaParaFinalizar();
    if (recibido === null || !mesa) return null;
    return recibido - mesa.totalGeneral;
  });

  // ESTADO MODAL DE COBRO DE DEUDA PENDIENTE
  mostrandoCobroDeuda = signal(false);
  deudaParaCobrar = signal<any>(null);
  checkoutMontoPagoDeuda = signal<number>(0);

  // Notificaciones emergentes
  notificaciones = signal<string[]>([]);

  // Hilos/Temporizadores
  private updateInterval: any;
  private timeTickInterval: any;
  private lastAlertsCount = 0;
  private audioAlert = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');

  // Valores de tiempos y costos en vivo
  liveTiempos = signal<Record<string, string>>({});
  liveCostosMesa = signal<Record<string, number>>({});

  actualizarUbicacionLocal() {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.http.put(`${API}/configuracion/ubicacion`, { lat: latitude, lng: longitude }).subscribe({
          next: () => alert(`Ubicación fijada correctamente.\nLat: ${latitude}\nLng: ${longitude}`),
          error: (err) => alert('Error al guardar la ubicación: ' + err.message)
        });
      },
      (err) => alert('Error obteniendo ubicación: ' + err.message)
    );
  }

  ngOnInit() {
    this.audioAlert.volume = 0.5;
    this.cargarProductos();
    this.cargarDatos();
    this.cargarHistorialBarra();
    this.cargarUsuarios();

    // Polling de actualización de datos cada 4 segundos
    this.updateInterval = setInterval(() => this.cargarDatos(), 4000);

    // Reloj secundario para actualizar los cronómetros cada segundo
    this.timeTickInterval = setInterval(() => this.tickTiempos(), 1000);
  }

  ngOnDestroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.timeTickInterval) clearInterval(this.timeTickInterval);
  }

  cargarProductos() {
    this.http.get<any[]>(`${API}/productos`).subscribe({
      next: p => this.productos.set(p.filter(x => x.isActive)),
      error: () => {}
    });
  }

  cargarUsuarios() {
    this.http.get<any[]>(`${API}/users/names`).subscribe({
      next: u => this.usuarios.set(u),
      error: () => {}
    });
  }

  cargarHistorialBarra() {
    // Listar las de hoy
    this.http.get<any[]>(`${API}/pedidos/activos`).subscribe({
      next: (pedidos) => {
        const completados = pedidos.filter(p => p.estado === 'entregado' && p.metodoPago !== 'cuenta_mesa');
        this.ventasDelDia.set(completados);
      },
      error: () => {}
    });
  }

  cargarDatos() {
    // 1. Obtener TODAS las mesas con su estado real (libre/ocupada)
    this.http.get<any[]>(`${API}/recursos/todas`).subscribe({
      next: (mesas) => this.recursosActivos.set(mesas),
      error: () => {}
    });

    // 2. Obtener pedidos en curso (de usuarios o mesas)
    this.http.get<any[]>(`${API}/pedidos/activos`).subscribe({
      next: (pedidos) => this.pedidosActivos.set(pedidos),
      error: () => {}
    });

    // 3. Obtener llamados de auxilio/atención
    this.http.get<any[]>(`${API}/operaciones/llamados/activos`).subscribe({
      next: (llamados) => {
        this.llamadosActivos.set(llamados);
        this.verificarNotificacionesNuevas(llamados);
      },
      error: () => {}
    });

    // 4. Obtener deudas pendientes (cuentas por cobrar)
    this.http.get<any[]>(`${API}/deudas/hoy`).subscribe({
      next: (deudas) => {
        // Filtrar deudas que no estén pagadas
        this.deudasActivas.set(deudas.filter(d => d.estado !== 'pagada'));
      },
      error: () => {}
    });
  }

  quitarNotificacionPorRecurso(recursoCode: string) {
    this.notificaciones.update(n => n.filter(msg => !msg.includes(recursoCode)));
  }

  verificarNotificacionesNuevas(llamados: any[]) {
    const totalActual = llamados.length + this.pedidosActivos().filter(p => p.estado === 'pendiente').length;
    if (totalActual > this.lastAlertsCount) {
      // Reproducir sonido de campana
      this.audioAlert.play().catch(() => {});
      
      // Agregar alerta visual
      const nuevasAlertas: string[] = [];
      llamados.forEach(l => {
        const desc = `Llamado de atención en ${l.recursoCode}`;
        if (!this.notificaciones().some(msg => msg.includes(l.recursoCode))) {
          nuevasAlertas.push(`🔔 ${desc}: "${l.mensaje || 'Necesita asistencia'}"`);
        }
      });

      this.pedidosActivos().filter(p => p.estado === 'pendiente').forEach(p => {
        const clienteName = p.usuario ? `${p.usuario.name} ${p.usuario.lastName}` : `Mesa ${p.recursoId}`;
        const msg = `🍔 Nuevo Pedido Pendiente de ${clienteName} por $${new Intl.NumberFormat().format(p.total)}`;
        if (!this.notificaciones().includes(msg)) {
          nuevasAlertas.push(msg);
        }
      });

      if (nuevasAlertas.length > 0) {
        this.notificaciones.update(n => [...nuevasAlertas, ...n].slice(0, 5));
      }
    }
    this.lastAlertsCount = totalActual;
  }

  quitarNotificacion(index: number) {
    this.notificaciones.update(n => n.filter((_, i) => i !== index));
  }

  // TICK DE RELOJ PARA CRONOMETROS EN TIEMPO REAL
  tickTiempos() {
    const tiempos: Record<string, string> = {};
    const costos: Record<string, number> = {};

    this.cuentasActivas().forEach(c => {
      if (c.tipo === 'mesa' && c.tiempoInicio) {
        const diffMs = Date.now() - new Date(c.tiempoInicio).getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        
        const h = Math.floor(diffSecs / 3600).toString().padStart(2, '0');
        const m = Math.floor((diffSecs % 3600) / 60).toString().padStart(2, '0');
        const s = (diffSecs % 60).toString().padStart(2, '0');

        tiempos[c.id] = `${h}:${m}:${s}`;
        
        const horasTranscurridas = diffSecs / 3600;
        costos[c.id] = Math.round(horasTranscurridas * (c.precioHora || 15000));
      }
    });

    this.liveTiempos.set(tiempos);
    this.liveCostosMesa.set(costos);

    // Actualizar cuenta seleccionada en vivo
    const actualSelected = this.selectedCuenta();
    if (actualSelected && actualSelected.tipo === 'mesa') {
      const liveCosto = costos[actualSelected.id] || 0;
      this.selectedCuenta.update(c => c ? {
        ...c,
        totalMesa: liveCosto,
        totalGeneral: liveCosto + c.totalConsumo
      } : null);
    }
  }

  // LISTADO CONSOLIDADO DE CUENTAS ACTIVAS (TARJETAS) - muestra TODAS las mesas y clientes independientes con pedidos activos
  cuentasActivas = computed(() => {
    const list: CuentaActiva[] = [];
    
    // 1. Mesas Activas
    this.recursosActivos().forEach(m => {
      // Asociar pedidos a la mesa si existen, esté o no ocupada la mesa
      const pedidosDeMesa = this.pedidosActivos().filter(
        p => p.recursoId === m.id && p.estado !== 'entregado' && p.estado !== 'cancelado'
      );
        
      const totalConsumo = pedidosDeMesa.reduce((acc, p) => acc + parseFloat(p.total), 0);

      let tiempoInicioDate: Date | undefined;
      if (m.tiempoInicio) {
        tiempoInicioDate = new Date(m.tiempoInicio);
      }

      const llamado = this.llamadosActivos().find(ll => ll.recursoId === m.id);
      const tienePedidoPendiente = pedidosDeMesa.some(p => p.estado === 'pendiente');

      list.push({
        id: `mesa-${m.id}`,
        tipo: 'mesa',
        nombre: m.code || `Mesa ${m.id}`,
        recursoId: m.id,
        partidaId: m.partidaId,
        jugadores: m.jugadores || [],
        jugadoresIds: m.jugadoresIds || [],
        tiempoInicio: tiempoInicioDate,
        precioHora: m.pricePerHour ? parseFloat(m.pricePerHour) : 15000,
        pedidos: pedidosDeMesa,
        totalConsumo,
        totalMesa: m.partidaId ? (this.liveCostosMesa()[`mesa-${m.id}`] || 0) : 0,
        totalGeneral: m.partidaId ? ((this.liveCostosMesa()[`mesa-${m.id}`] || 0) + totalConsumo) : totalConsumo,
        llamadoAyuda: !!llamado,
        llamadoId: llamado?.id,
        nuevoPedidoPendiente: tienePedidoPendiente,
        status: m.status
      });
    });

    // 2. Pedidos sin mesa (pedidos de barra/app de clientes individuales)
    const pedidosSinMesa = this.pedidosActivos().filter(
      p => !p.recursoId && p.estado !== 'entregado' && p.estado !== 'cancelado'
    );
    
    // Agrupar por usuarioId
    const pedidosPorUsuario = new Map<number, any[]>();
    pedidosSinMesa.forEach(p => {
      const uId = p.usuarioId || 0;
      if (!pedidosPorUsuario.has(uId)) {
        pedidosPorUsuario.set(uId, []);
      }
      pedidosPorUsuario.get(uId)!.push(p);
    });

    pedidosPorUsuario.forEach((pedidos, uId) => {
      const primerPedido = pedidos[0];
      const user = primerPedido.usuario;
      const nombre = user ? `${user.name} ${user.lastName || ''}`.trim() : `Cliente #${uId || primerPedido.id}`;
      const totalConsumo = pedidos.reduce((acc, p) => acc + parseFloat(p.total), 0);
      const tienePedidoPendiente = pedidos.some(p => p.estado === 'pendiente');

      list.push({
        id: `usuario-${uId || primerPedido.id}`,
        tipo: 'cliente',
        nombre: nombre,
        usuarioId: uId || undefined,
        pedidos: pedidos,
        totalConsumo,
        totalMesa: 0,
        totalGeneral: totalConsumo,
        nuevoPedidoPendiente: tienePedidoPendiente,
        status: 'available'
      });
    });

    const q = this.filtroBusqueda().toLowerCase().trim();
    if (!q) return list;
    return list.filter(c => c.nombre.toLowerCase().includes(q) || (c.jugadores && c.jugadores.join(' ').toLowerCase().includes(q)));
  });

  seleccionarCuenta(c: CuentaActiva) {
    this.selectedCuenta.set(c);
  }

  cerrarDetalle() {
    this.selectedCuenta.set(null);
  }

  // ACCIONES SOBRE CUENTAS

  atenderLlamado(cuenta: CuentaActiva) {
    if (!cuenta.llamadoId) return;
    this.http.post(`${API}/operaciones/llamados/${cuenta.llamadoId}/atender`, {}).subscribe({
      next: () => {
        this.quitarNotificacionPorRecurso(cuenta.nombre);
        this.cargarDatos();
        if (this.selectedCuenta()?.id === cuenta.id) {
          this.selectedCuenta.update(c => c ? { ...c, llamadoAyuda: false, llamadoId: undefined } : null);
        }
      }
    });
  }

  aprobarPedidosDeCuenta(cuenta: CuentaActiva) {
    const pendientes = cuenta.pedidos.filter(p => p.estado === 'pendiente');
    if (pendientes.length === 0) return;

      pendientes.forEach(p => {
      this.http.put(`${API}/pedidos/${p.id}/preparar`, {}).subscribe({
        next: () => {
          this.cargarDatos();
          this.mostrarToast('✅ Pedido aprobado correctamente.');
        }
      });
    });
  }

  cancelarPedido(pedidoId: number) {
    // Usar el sistema de confirmación interno
    const motivo = 'Cancelado por el garitero';
    this.http.put(`${API}/pedidos/${pedidoId}/cancelar`, { motivo }).subscribe({
      next: () => {
        this.cargarDatos();
        this.mostrarToast('🗑️ Pedido cancelado. Stock devuelto.');
      },
      error: (err) => {
        this.mostrarToast('❌ Error al cancelar: ' + (err.error?.message || 'Error del servidor'));
      }
    });
  }

  // ================= INICIAR MESA MANUAL =================

  abrirIniciarMesaManual(cuenta: CuentaActiva) {
    this.cargarUsuarios();
    this.mesaParaIniciar.set(cuenta);
    this.manualJugador1Tipo.set('registrado');
    this.manualJugador1Registrado.set(null);
    this.manualJugador1NombreOcasional.set('');
    
    this.manualJugador2Tipo.set('registrado');
    this.manualJugador2Registrado.set(null);
    this.manualJugador2NombreOcasional.set('');
    this.mostrandoIniciarMesaManual.set(true);
  }

  cerrarIniciarMesaManual() {
    this.mostrandoIniciarMesaManual.set(false);
    this.mesaParaIniciar.set(null);
  }

  guardarIniciarMesaManual() {
    const mesa = this.mesaParaIniciar();
    if (!mesa) return;

    // Obtener nombres de jugadores
    let j1 = '';
    let j1Id: number | undefined = undefined;
    if (this.manualJugador1Tipo() === 'registrado' && this.manualJugador1Registrado()) {
      const u = this.usuarios().find(x => Number(x.id) === Number(this.manualJugador1Registrado()));
      j1 = u ? `${u.name} ${u.lastName || ''}`.trim() : '';
      j1Id = Number(this.manualJugador1Registrado());
    } else if (this.manualJugador1Tipo() === 'ocasional' && this.manualJugador1NombreOcasional().trim()) {
      j1 = this.manualJugador1NombreOcasional().trim();
    }

    let j2 = '';
    let j2Id: number | undefined = undefined;
    if (this.manualJugador2Tipo() === 'registrado' && this.manualJugador2Registrado()) {
      const u = this.usuarios().find(x => Number(x.id) === Number(this.manualJugador2Registrado()));
      j2 = u ? `${u.name} ${u.lastName || ''}`.trim() : '';
      j2Id = Number(this.manualJugador2Registrado());
    } else if (this.manualJugador2Tipo() === 'ocasional' && this.manualJugador2NombreOcasional().trim()) {
      j2 = this.manualJugador2NombreOcasional().trim();
    }

    if (!j1) {
      this.mostrarToast('⚠️ Especifica al menos al Jugador 1 responsable (registrado o el nombre ocasional).');
      return;
    }

    const body = {
      resourceId: mesa.recursoId,
      jugadores: [j1, j2].filter(Boolean),
      startTime: new Date().toISOString(),
      jugador1Id: j1Id,
      jugador2Id: j2Id
    };

    this.http.post(`${API}/partidas/iniciar`, body).subscribe({
      next: () => {
        this.cargarDatos();
        this.cerrarIniciarMesaManual();
        this.selectedCuenta.set(null);
        this.mostrarToast(`✅ ¡Tiempo iniciado en ${mesa.nombre}!`);
      },
      error: (err) => {
        this.mostrarToast('❌ Error al iniciar: ' + (err.error?.message || 'Mesa no disponible.'));
      }
    });
  }

  // ================= FINALIZAR TIEMPO Y ASIGNACIÓN DE CUENTA (WIZARD) =================

  abrirFinalizarMesa(cuenta: CuentaActiva) {
    this.cargarUsuarios();
    this.mesaParaFinalizar.set(cuenta);
    this.checkoutQuienPaga.set('j1');
    this.checkoutOtroUsuarioId.set(null);
    this.checkoutMetodoPago.set('efectivo');
    this.checkoutNotas.set('');
    this.checkoutEfectivoRecibido.set(null);
    this.mostrandoFinalizarMesaCobro.set(true);
  }

  cerrarFinalizarMesa() {
    this.mostrandoFinalizarMesaCobro.set(false);
    this.mesaParaFinalizar.set(null);
  }

  guardarFinalizarMesaCobro() {
    const cuenta = this.mesaParaFinalizar();
    if (!cuenta || !cuenta.partidaId) return;

    // Obtener los usuarios más recientes del backend antes de procesar el pago/deuda
    this.http.get<any[]>(`${API}/users/names`).subscribe({
      next: (latestUsers) => {
        this.usuarios.set(latestUsers);

        // 1. Determinar quién asume el cobro/deuda
        let nombreDebtor = '';
        let userDebtorId: number | null = null;

        if (this.checkoutQuienPaga() === 'j1') {
          nombreDebtor = cuenta.jugadores?.[0] || 'Jugador 1';
          // Usar directamente el ID asociado a la mesa, si existe
          if (cuenta.jugadoresIds && cuenta.jugadoresIds.length > 0) {
             userDebtorId = cuenta.jugadoresIds[0];
          } else {
             // Fallback: Buscar por nombre
             const found = this.usuarios().find(u => {
               const fullName = `${u.name} ${u.lastName || ''}`.trim().toLowerCase();
               return fullName === nombreDebtor.toLowerCase() || u.name.toLowerCase() === nombreDebtor.toLowerCase();
             });
             if (found) userDebtorId = Number(found.id);
          }
        } else if (this.checkoutQuienPaga() === 'j2') {
          nombreDebtor = cuenta.jugadores?.[1] || 'Jugador 2';
          if (cuenta.jugadoresIds && cuenta.jugadoresIds.length > 1) {
             userDebtorId = cuenta.jugadoresIds[1];
          } else {
             const found = this.usuarios().find(u => {
               const fullName = `${u.name} ${u.lastName || ''}`.trim().toLowerCase();
               return fullName === nombreDebtor.toLowerCase() || u.name.toLowerCase() === nombreDebtor.toLowerCase();
             });
             if (found) userDebtorId = Number(found.id);
          }
        } else if (this.checkoutQuienPaga() === 'otro_registrado') {
          const u = this.usuarios().find(x => Number(x.id) === Number(this.checkoutOtroUsuarioId()));
          nombreDebtor = u ? `${u.name} ${u.lastName || ''}`.trim() : 'Usuario';
          userDebtorId = this.checkoutOtroUsuarioId() ? Number(this.checkoutOtroUsuarioId()) : null;
        } else if (this.checkoutQuienPaga() === 'cliente_nuevo') {
          nombreDebtor = this.checkoutNombreClienteOcasional().trim() || 'Cliente Ocasional';
          userDebtorId = null;
        }

        // 2. Parar tiempo de la mesa en el backend
        this.http.put(`${API}/partidas/finalizar`, {
          partidaId: cuenta.partidaId,
          marcador: { j1: 10, j2: 8 },
          endTime: new Date().toISOString(),
          metodoPago: this.checkoutMetodoPago()
        }).subscribe({
          next: () => {
            // 3. Procesar cobro inmediato o registrar deuda
            if (this.checkoutMetodoPago() === 'deuda') {
              // Registrar como deuda
              const bodyDeuda = {
                userId: userDebtorId || null,
                nombreCliente: userDebtorId ? undefined : nombreDebtor,
                monto: cuenta.totalGeneral,
                descripcion: `Deuda de juego en ${cuenta.nombre} (Mesa + Consumos)`,
                notas: this.checkoutNotas().trim() || 'Registrado al cerrar partida.'
              };

              this.http.post(`${API}/deudas`, bodyDeuda).subscribe({
                next: () => {
                  this.entregarConsumosDeCuentaFinalizada(cuenta, 'deuda');
                  this.mostrarToast(`💰 Deuda registrada para ${nombreDebtor}: $${new Intl.NumberFormat('es-CO').format(cuenta.totalGeneral)}`);
                },
                error: () => {
                  this.mostrarToast('❌ Error al registrar la deuda. Intenta de nuevo.');
                }
              });
            } else {
              this.entregarConsumosDeCuentaFinalizada(cuenta, this.checkoutMetodoPago() as any);
              this.mostrarToast(`✅ Cuenta cobrada en ${this.checkoutMetodoPago().toUpperCase()} a nombre de ${nombreDebtor}.`);
            }
          },
          error: (err) => {
            this.mostrarToast('❌ Error al finalizar: ' + (err.error?.message || 'Error'));
          }
        });
      },
      error: () => {
        this.mostrarToast('❌ Error al obtener usuarios. Intenta de nuevo.');
      }
    });
  }

  private entregarConsumosDeCuentaFinalizada(cuenta: CuentaActiva, metodo: 'efectivo' | 'transferencia' | 'deuda' | 'cuenta_mesa') {
    let completedRequests = 0;
    const pedidosAPagar = cuenta.pedidos;

    if (pedidosAPagar.length === 0) {
      this.concluirWizardFinalizacion();
      return;
    }

    pedidosAPagar.forEach(p => {
      this.http.put(`${API}/pedidos/${p.id}/entregar`, {
        metodoPago: metodo,
        pagado: p.total
      }).subscribe({
        next: () => {
          completedRequests++;
          if (completedRequests === pedidosAPagar.length) {
            this.concluirWizardFinalizacion();
          }
        },
        error: () => {
          completedRequests++;
          if (completedRequests === pedidosAPagar.length) {
            this.concluirWizardFinalizacion();
          }
        }
      });
    });
  }

  private concluirWizardFinalizacion() {
    this.selectedCuenta.set(null);
    this.cerrarFinalizarMesa();
    this.cargarDatos();
    this.cargarHistorialBarra();
  }

  // AGREGAR CONSUMOS DESDE EL PANEL DEL GARITERO
  abrirAgregarProductos(cuenta: CuentaActiva) {
    this.cuentaParaAgregar.set(cuenta);
    this.carritoAgregar.set([]);
    this.mostrandoAgregarProductos.set(true);
  }

  cerrarAgregarProductos() {
    this.mostrandoAgregarProductos.set(false);
    this.cuentaParaAgregar.set(null);
    this.carritoAgregar.set([]);
  }

  agregarAlCarritoAgregar(p: any) {
    this.carritoAgregar.update(c => {
      const existe = c.find(i => i.id === p.id);
      if (existe) return c.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...c, { id: p.id, nombre: p.name, precio: p.price, cantidad: 1 }];
    });
  }

  quitarDelCarritoAgregar(id: number) {
    this.carritoAgregar.update(c => {
      const item = c.find(i => i.id === id);
      if (item && item.cantidad > 1) return c.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i);
      return c.filter(i => i.id !== id);
    });
  }

  get totalAgregar() { return this.carritoAgregar().reduce((a, i) => a + i.precio * i.cantidad, 0); }

  guardarConsumoAgregado() {
    const cuenta = this.cuentaParaAgregar();
    if (!cuenta || this.carritoAgregar().length === 0) return;

    const body = {
      recursoId: cuenta.recursoId || null,
      usuarioId: cuenta.usuarioId || null,
      metodoPago: 'cuenta_mesa',
      notas: 'Consumo agregado por Garitero',
      metadata: { origen: 'barra' },
      items: this.carritoAgregar().map(i => ({
        productId: i.id,
        cantidad: i.cantidad
      }))
    };

    this.http.post<any>(`${API}/pedidos`, body).subscribe({
      next: (pedido) => {
        this.http.put(`${API}/pedidos/${pedido.id}/preparar`, {}).subscribe(() => {
          this.cargarDatos();
          this.cerrarAgregarProductos();
          if (this.selectedCuenta()?.id === cuenta.id) {
            setTimeout(() => {
              const actualizada = this.cuentasActivas().find(c => c.id === cuenta.id);
              if (actualizada) this.selectedCuenta.set(actualizada);
            }, 500);
          }
          this.mostrarToast('✅ Consumo agregado a la cuenta.');
        });
      },
      error: () => this.mostrarToast('❌ Error al agregar el consumo.')
    });
  }

  // ================= DEUDAS (CUENTAS PENDIENTES) =================
  
  abrirCobroDeuda(deuda: any) {
    this.deudaParaCobrar.set(deuda);
    this.checkoutMontoPagoDeuda.set(parseFloat(deuda.monto) - parseFloat(deuda.montoPagado || 0));
    this.mostrandoCobroDeuda.set(true);
  }

  cerrarCobroDeuda() {
    this.mostrandoCobroDeuda.set(false);
    this.deudaParaCobrar.set(null);
  }

  guardarCobroDeuda() {
    const deuda = this.deudaParaCobrar();
    const monto = this.checkoutMontoPagoDeuda();
    if (!deuda || monto <= 0) return;
    
    this.http.post(`${API}/deudas/${deuda.id}/pago`, { montoPago: monto }).subscribe({
      next: () => {
        this.cargarDatos();
        this.cerrarCobroDeuda();
        this.mostrarToast('✅ Pago registrado. La cuenta se actualizará en segundos.');
      },
      error: () => this.mostrarToast('❌ Error al registrar el pago de deuda.')
    });
  }

  // ================= VENTA DIRECTA (CARRITO RÁPIDO) =================

  agregarAlCarritoBarra(p: any) {
    this.carritoBarra.update(c => {
      const existe = c.find(i => i.id === p.id);
      if (existe) return c.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...c, { id: p.id, nombre: p.name, precio: p.price, cantidad: 1 }];
    });
  }

  quitarDelCarritoBarra(id: number) {
    this.carritoBarra.update(c => {
      const item = c.find(i => i.id === id);
      if (item && item.cantidad > 1) return c.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i);
      return c.filter(i => i.id !== id);
    });
  }

  get totalBarra() { return this.carritoBarra().reduce((a, i) => a + i.precio * i.cantidad, 0); }

  cobrarBarra() {
    if (this.carritoBarra().length === 0) return;
    
    // Si el método es deuda, validar campos
    let nombreDebtor = '';
    let userDebtorId: number | null = null;

    if (this.metodoPagoBarra() === 'deuda') {
      if (this.barraQuienPaga() === 'registrado') {
        const u = this.usuarios().find(x => Number(x.id) === Number(this.barraUsuarioRegistradoId()));
        if (!u) {
          this.mostrarToast('⚠️ Selecciona un cliente registrado.');
          return;
        }
        nombreDebtor = `${u.name} ${u.lastName || ''}`.trim();
        userDebtorId = Number(this.barraUsuarioRegistradoId());
      } else {
        nombreDebtor = this.barraNombreClienteOcasional().trim();
        if (!nombreDebtor) {
          this.mostrarToast('⚠️ Ingresa el nombre del cliente ocasional.');
          return;
        }
      }
    }

    const body = {
      recursoId: null,
      usuarioId: userDebtorId,
      metodoPago: this.metodoPagoBarra() === 'deuda' ? 'cuenta_mesa' : this.metodoPagoBarra(),
      notas: 'Venta rápida en barra' + (this.metodoPagoBarra() === 'deuda' ? ' (Cuenta pendiente)' : ''),
      metadata: { origen: 'barra' },
      items: this.carritoBarra().map(i => ({
        productId: i.id,
        cantidad: i.cantidad
      }))
    };

    this.http.post<any>(`${API}/pedidos`, body).subscribe({
      next: (pedido) => {
        if (this.metodoPagoBarra() === 'deuda') {
          // Si es deuda, crear primero la deuda
          const bodyDeuda = {
            userId: userDebtorId || null,
            nombreCliente: userDebtorId ? undefined : nombreDebtor,
            monto: pedido.total,
            descripcion: 'Consumo en barra',
            notas: 'Venta rápida asignada a cuenta'
          };
          this.http.post(`${API}/deudas`, bodyDeuda).subscribe({
            next: () => {
              // Luego entregar el pedido
              this.entregarPedidoBarra(pedido.id, 'cuenta_mesa', pedido.total);
              this.mostrarToast(`💰 Deuda registrada para ${nombreDebtor}: $${new Intl.NumberFormat('es-CO').format(pedido.total)}`);
            },
            error: (err) => {
              console.error(err);
              const msg = err.error?.message || err.message || 'Error al registrar la deuda en barra.';
              this.mostrarToast(`❌ ${msg}`);
            }
          });
        } else {
          // Entregar directo si es efectivo o transferencia
          this.entregarPedidoBarra(pedido.id, this.metodoPagoBarra() as any, pedido.total);
          this.mostrarToast(`✅ Venta rápida registrada: $${new Intl.NumberFormat('es-CO').format(pedido.total)}`);
        }
        this.carritoBarra.set([]);
        this.barraUsuarioRegistradoId.set('');
        this.barraNombreClienteOcasional.set('');
      },
      error: (err) => {
        console.error(err);
        const msg = err.error?.message || err.message || 'Error al registrar la venta.';
        this.mostrarToast(`❌ ${msg}`);
      }
    });
  }

  private entregarPedidoBarra(pedidoId: number, metodoPago: string, pagado: number) {
    this.http.put(`${API}/pedidos/${pedidoId}/entregar`, {
      metodoPago,
      pagado
    }).subscribe(() => {
      this.cargarHistorialBarra();
      this.cargarDatos(); // Para actualizar cuentas pendientes si aplica
      this.carritoBarra.set([]);
    });
  }

  resolverLlamadoDirecto(id: number) {
    this.http.get<any[]>(`${API}/operaciones/llamados/activos`).subscribe(llamados => {
      const ll = llamados.find((x: any) => x.id === id);
      if (ll) this.quitarNotificacionPorRecurso(ll.recursoCode);
      
      this.http.post(`${API}/operaciones/llamados/${id}/atender`, {}).subscribe({
        next: () => {
          this.cargarDatos();
          this.mostrarToast('✅ Solicitud atendida correctamente.');
        }
      });
    });
  }

  aprobarPeticionMesa(llamado: any) {
    const msg = llamado.mensaje || '';
    const oponenteMatch = msg.match(/Oponente:\s*(.*)/);
    const oponenteName = oponenteMatch ? oponenteMatch[1].trim() : 'Juego Libre';

    const body: any = {
      resourceId: llamado.recursoId,
      jugadores: [llamado.usuarioName, oponenteName],
      startTime: new Date().toISOString(),
      // Pasar el ID del usuario solicitante directamente para evitar búsqueda por nombre
      jugador1Id: llamado.usuarioId,
    };

    // 1. Iniciar la partida
    this.http.post(`${API}/partidas/iniciar`, body).subscribe({
      next: () => {
        // 2. Marcar petición como atendida y quitar notificación
        this.quitarNotificacionPorRecurso(llamado.recursoCode);
        this.http.post(`${API}/operaciones/llamados/${llamado.id}/atender`, {}).subscribe({
          next: () => {
            this.cargarDatos();
            this.mostrarToast(`✅ ¡Mesa ${llamado.recursoCode} habilitada para ${llamado.usuarioName}!`);
          }
        });
      },
      error: (err) => {
        this.mostrarToast('❌ Error al habilitar mesa: ' + (err.error?.message || 'No disponible.'));
      }
    });
  }

  prepararPedido(pedidoId: number) {
    this.http.put(`${API}/pedidos/${pedidoId}/preparar`, {}).subscribe({
      next: () => {
        this.cargarDatos();
        this.mostrarToast('👨‍🍳 Pedido en preparación.');
        this.actualizarDetalleCuentaSeleccionada();
      },
      error: () => this.mostrarToast('❌ Error al preparar pedido.')
    });
  }

  marcarListoPedido(pedidoId: number) {
    this.http.put(`${API}/pedidos/${pedidoId}/listo`, {}).subscribe({
      next: () => {
        this.cargarDatos();
        this.mostrarToast('📦 Pedido listo para entrega.');
        this.actualizarDetalleCuentaSeleccionada();
      },
      error: () => this.mostrarToast('❌ Error al marcar listo.')
    });
  }

  entregarPedido(pedidoId: number, metodoPago: string, total: number) {
    this.http.put(`${API}/pedidos/${pedidoId}/entregar`, { metodoPago, pagado: total }).subscribe({
      next: () => {
        this.cargarDatos();
        this.mostrarToast('✅ Pedido entregado con éxito.');
        this.actualizarDetalleCuentaSeleccionada();
      },
      error: () => this.mostrarToast('❌ Error al entregar pedido.')
    });
  }

  cerrarCuentaCliente(cuenta: CuentaActiva, metodoPago: 'efectivo' | 'transferencia' | 'deuda') {
    if (!cuenta.pedidos || cuenta.pedidos.length === 0) return;

    const total = cuenta.totalConsumo;
    const itemsDescription = cuenta.pedidos
      .flatMap(p => p.items || [])
      .map(i => `${i.cantidad}x ${i.producto?.name || 'Producto'}`)
      .join(', ');

    const processClosure = () => {
      let completedRequests = 0;
      const pedidos = cuenta.pedidos;

      pedidos.forEach(p => {
        this.http.put(`${API}/pedidos/${p.id}/entregar`, {
          metodoPago: metodoPago,
          pagado: p.total
        }).subscribe({
          next: () => {
            completedRequests++;
            if (completedRequests === pedidos.length) {
              this.finalizarCierreCuentaCliente(cuenta, metodoPago);
            }
          },
          error: () => {
            completedRequests++;
            if (completedRequests === pedidos.length) {
              this.finalizarCierreCuentaCliente(cuenta, metodoPago);
            }
          }
        });
      });
    };

    if (metodoPago === 'deuda') {
      const bodyDeuda = {
        userId: cuenta.usuarioId || null,
        nombreCliente: cuenta.usuarioId ? undefined : cuenta.nombre,
        monto: total,
        descripcion: `Consumo de barra/alimentos (${cuenta.nombre}): ${itemsDescription.substring(0, 100)}`,
        notas: 'Registrado desde el control de pedidos por el garitero.'
      };

      this.http.post(`${API}/deudas`, bodyDeuda).subscribe({
        next: () => {
          processClosure();
        },
        error: () => {
          this.mostrarToast('❌ Error al registrar la deuda en el sistema.');
        }
      });
    } else {
      processClosure();
    }
  }

  private finalizarCierreCuentaCliente(cuenta: CuentaActiva, metodoPago: string) {
    this.selectedCuenta.set(null);
    this.cargarDatos();
    this.cargarHistorialBarra();
    
    if (metodoPago === 'deuda') {
      this.mostrarToast(`💰 Cuenta de ${cuenta.nombre} registrada como Deuda Pendiente.`);
    } else {
      this.mostrarToast(`✅ Cuenta de ${cuenta.nombre} cobrada con éxito (${metodoPago.toUpperCase()}).`);
    }
  }

  traspasarDeudaAHistorial(deudaId: number) {
    this.http.post(`${API}/deudas/${deudaId}/pasar-historial`, {}).subscribe({
      next: () => {
        this.cargarDatos();
        this.mostrarToast('📤 Deuda transferida al historial general.');
      },
      error: () => this.mostrarToast('❌ Error al traspasar deuda.')
    });
  }

  private actualizarDetalleCuentaSeleccionada() {
    const actual = this.selectedCuenta();
    if (actual) {
      setTimeout(() => {
        const actualizada = this.cuentasActivas().find(c => c.id === actual.id);
        if (actualizada) this.selectedCuenta.set(actualizada);
      }, 500);
    }
  }

  mostrarToast(msg: string) {
    this.notificaciones.update(n => [msg, ...n].slice(0, 5));
    setTimeout(() => {
      this.notificaciones.update(n => n.filter(m => m !== msg));
    }, 4000);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(value || 0);
  }
}
