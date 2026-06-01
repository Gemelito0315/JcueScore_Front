import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PedidosService } from '../../core/services/pedidos.service';
import { ExcelExportService } from '../../services/excel-export.service';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-reportes',
  imports: [CommonModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes implements OnInit {
  private http           = inject(HttpClient);
  private pedidosService = inject(PedidosService);
  private excelService   = inject(ExcelExportService);

  periodoActivo = signal<'hoy' | 'semana' | 'mes'>('hoy');
  loading       = signal(true);
  pollId: any;
  totalPedidosIngresos = 0;
  totalCostoPartidas = 0;

  stats = signal({
    ingresoTotal: 0,
    ingresoAnterior: 0,
    totalPartidas: 0,
    partidasAnterior: 0,
    horasJugadas: 0,
    clientesUnicos: 0,
    mesaMasUsada: '—',
    horaPico: '—',
    promedioPartida: 0,
  });

  ingresosDia     = signal<{ dia: string; valor: number }[]>([]);
  usoTipos        = signal<{ tipo: string; partidas: number; porcentaje: number; color: string }[]>([]);
  topMesas        = signal<{ code: string; horas: number; ingresos: number; partidas: number }[]>([]);
  topClientes     = signal<{ nombre: string; visitas: number; gasto: number; nivel: string }[]>([]);
  productosMasVendidos = signal<{ name: string; vendidos: number; ingresos: number }[]>([]);

  private readonly COLORES = ['#06b6d4', '#6366f1', '#34d399', '#f59e0b', '#f87171'];

  ngOnInit() {
    this.cargarDatos();
    this.pollId = setInterval(() => this.cargarDatos(), 10000);
  }

  ngOnDestroy() {
    if (this.pollId) clearInterval(this.pollId);
  }

  cargarDatos() {
    this.loading.set(true);
    const periodo = this.periodoActivo();
    
    // Estadísticas diarias de pedidos
    this.pedidosService.obtenerEstadisticasDiarias().subscribe({
      next: (est) => {
        this.totalPedidosIngresos = Number(est.ingresosTotales || 0);
        this.stats.update(s => ({
          ...s,
          ingresoTotal: this.totalPedidosIngresos + this.totalCostoPartidas,
          totalPartidas: Number(est.pedidosEntregados || 0),
          promedioPartida: Number(est.pedidosEntregados || 0) > 0
            ? Math.round(this.totalPedidosIngresos / Number(est.pedidosEntregados))
            : 0,
        }));
        this.loading.set(false);
      },
      error: () => { this.cargarDatosFallback(); }
    });

    // Productos más vendidos
    this.pedidosService.obtenerProductosMasVendidos().subscribe({
      next: (data) => {
        this.productosMasVendidos.set(data.slice(0, 5).map((p: any) => ({
          name: p.name ?? p.product?.name ?? 'Producto',
          vendidos: p.totalVendidos ?? p.count ?? 0,
          ingresos: p.totalIngresos ?? 0,
        })));
      },
      error: () => {}
    });

    // Mesas / partidas
    this.http.get<any[]>(`${API}/partidas?periodo=${periodo}`).subscribe({
      next: (partidas) => {
        this.totalCostoPartidas = partidas.reduce((a: number, p: any) => a + Number(p.costoTotal || 0), 0);
        const horasCalculadas = partidas.reduce((a: number, p: any) => {
           if (p.horaFin && p.horaInicio) {
              return a + ((new Date(p.horaFin).getTime() - new Date(p.horaInicio).getTime()) / 3600000);
           }
           return a;
        }, 0);
        
        const ids = new Set([...partidas.map((p: any) => p.jugador1Id), ...partidas.map((p: any) => p.jugador2Id)].filter(Boolean));

        this.stats.update(s => ({
          ...s,
          ingresoTotal: this.totalPedidosIngresos + this.totalCostoPartidas,
          totalPartidas: partidas.length,
          horasJugadas: Math.round(horasCalculadas * 10) / 10,
          clientesUnicos: ids.size,
        }));

        // Agrupar por tipo de recurso
        const tiposMap: Record<string, number> = {};
        partidas.forEach((p: any) => {
          const t = p.recurso?.gameType?.name ?? 'Billar';
          tiposMap[t] = (tiposMap[t] ?? 0) + 1;
        });
        const total = partidas.length || 1;
        this.usoTipos.set(
          Object.entries(tiposMap).map(([tipo, count], i) => ({
            tipo,
            partidas: count,
            porcentaje: Math.round((count / total) * 100),
            color: this.COLORES[i % this.COLORES.length],
          }))
        );

        // Top mesas
        const mesasMap: Record<string, { horas: number; ingresos: number; partidas: number }> = {};
        partidas.forEach((p: any) => {
          const code = p.recurso?.code ?? 'Mesa';
          if (!mesasMap[code]) mesasMap[code] = { horas: 0, ingresos: 0, partidas: 0 };
          mesasMap[code].partidas++;
          if (p.horaFin && p.horaInicio) {
             mesasMap[code].horas += ((new Date(p.horaFin).getTime() - new Date(p.horaInicio).getTime()) / 3600000);
          }
          mesasMap[code].ingresos += Number(p.costoTotal || 0);
        });
        this.topMesas.set(
          Object.entries(mesasMap)
            .map(([code, v]) => ({ code, horas: Math.round(v.horas * 10) / 10, ingresos: v.ingresos, partidas: v.partidas }))
            .sort((a, b) => b.partidas - a.partidas)
            .slice(0, 5)
        );
      },
      error: () => {}
    });

    // Ingresos por día (últimos 7 días)
    this.http.get<any[]>(`${API}/partidas/ingresos-dia`).subscribe({
      next: (data) => {
        this.ingresosDia.set(data.map((d: any) => ({
          dia: d.dia ?? d.date ?? '',
          valor: d.valor ?? d.ingresos ?? 0,
        })));
      },
      error: () => {
        // Mock de días de la semana
        const dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
        this.ingresosDia.set(dias.map(dia => ({ dia, valor: Math.floor(Math.random() * 80000) + 30000 })));
      }
    });
  }

  private cargarDatosFallback() {
    this.stats.set({
      ingresoTotal: 485000, ingresoAnterior: 420000,
      totalPartidas: 34,    partidasAnterior: 28,
      horasJugadas: 52,     clientesUnicos: 21,
      mesaMasUsada: 'Mesa 1', horaPico: '7:00 PM - 9:00 PM',
      promedioPartida: 14250,
    });
    this.usoTipos.set([
      { tipo: 'Billar',       partidas: 18, porcentaje: 53, color: '#06b6d4' },
      { tipo: 'Tres Bandas',  partidas: 10, porcentaje: 29, color: '#6366f1' },
      { tipo: 'Tejo',         partidas:  4, porcentaje: 12, color: '#34d399' },
      { tipo: 'Bolirama',     partidas:  2, porcentaje:  6, color: '#f59e0b' },
    ]);
    this.topMesas.set([
      { code: 'Mesa 1',   horas: 18, ingresos: 270000, partidas: 12 },
      { code: 'Mesa 3',   horas: 14, ingresos: 280000, partidas: 10 },
      { code: 'Mesa 2',   horas: 10, ingresos: 150000, partidas:  8 },
      { code: 'Chancha 1',horas:  6, ingresos:  72000, partidas:  4 },
    ]);
    this.topClientes.set([
      { nombre: 'Carlos R.',  visitas: 8, gasto: 114000, nivel: 'Oro'   },
      { nombre: 'Andrés M.', visitas: 6, gasto:  85000, nivel: 'Plata'  },
      { nombre: 'Luis P.',   visitas: 5, gasto:  70000, nivel: 'Plata'  },
    ]);
    this.loading.set(false);
  }

  cambiarPeriodo(p: 'hoy' | 'semana' | 'mes') {
    this.periodoActivo.set(p);
    this.cargarDatos();
  }

  exportarExcel() {
    const data = [
      {
        'Período': this.periodoActivo().toUpperCase(),
        'Ingresos Totales': this.stats().ingresoTotal,
        'Partidas Jugadas': this.stats().totalPartidas,
        'Horas de Juego': this.stats().horasJugadas,
        'Clientes Únicos': this.stats().clientesUnicos,
        'Mesa Más Usada': this.stats().mesaMasUsada,
      }
    ];

    this.excelService.exportAsExcelFile(data, `Reporte_General_${this.periodoActivo()}`);
  }

  get maxIngreso() { return Math.max(...this.ingresosDia().map(d => d.valor), 1); }
  get variacionIngreso() {
    const a = this.stats().ingresoTotal, b = this.stats().ingresoAnterior;
    return b ? Math.round(((a - b) / b) * 100) : 0;
  }
  get variacionPartidas() {
    const a = this.stats().totalPartidas, b = this.stats().partidasAnterior;
    return b ? Math.round(((a - b) / b) * 100) : 0;
  }
  formatPrice(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  }
  getNivelColor(nivel: string) {
    return ({ Oro: '#fbbf24', Plata: '#94a3b8', Bronce: '#f59e0b' } as any)[nivel] ?? '#64748b';
  }
}
