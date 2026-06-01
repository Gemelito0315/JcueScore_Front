import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ExcelExportService } from '../../services/excel-export.service';

export interface TurnoCaja {
  id: number;
  garitero: string;
  fechaApertura: string;
  fechaCierre: string | null;
  horaApertura: string;
  horaCierre: string | null;
  saldoInicial: number;
  totalVentas: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalDeudas: number;
  gastos: number;
  saldoFinal: number;
  diferencia: number;
  estado: 'abierto' | 'cerrado' | 'cuadrado';
  observaciones: string;
}

const API = 'http://localhost:3000';

@Component({
  selector: 'app-caja-admin',
  imports: [CommonModule],
  templateUrl: './caja.html',
  styleUrl: './caja.scss'
})
export class CajaAdmin implements OnInit {
  private http = inject(HttpClient);
  private excel = inject(ExcelExportService);
  
  private _turnos  = signal<TurnoCaja[]>([]);
  filtroGaritero   = signal('all');
  filtroEstado     = signal('all');
  selectedTurno    = signal<TurnoCaja | null>(null);
  showDetail       = signal(false);
  loading          = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.http.get<TurnoCaja[]>(`${API}/operaciones/turnos`).subscribe({
      next: (data) => {
        this._turnos.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando arqueos:', err);
        this.loading.set(false);
      }
    });
  }

  /** Lista de gariteros únicos para el filtro */
  gariteros = computed(() =>
    [...new Set(this._turnos().map(t => t.garitero))].sort()
  );

  /** Turnos filtrados */
  turnos = computed(() => {
    let list = this._turnos();
    if (this.filtroGaritero() !== 'all') {
      list = list.filter(t => t.garitero === this.filtroGaritero());
    }
    if (this.filtroEstado() !== 'all') {
      list = list.filter(t => t.estado === this.filtroEstado());
    }
    return list;
  });

  /** KPIs del período visible */
  kpis = computed(() => {
    const list = this.turnos();
    const cerrados = list.filter(t => t.estado !== 'abierto');
    return {
      totalVentas:      list.reduce((s, t) => s + t.totalVentas, 0),
      totalEfectivo:    cerrados.reduce((s, t) => s + t.totalEfectivo, 0),
      totalTransf:      cerrados.reduce((s, t) => s + t.totalTransferencia, 0),
      totalDeudas:      list.reduce((s, t) => s + t.totalDeudas, 0),
      turnosConDif:     cerrados.filter(t => t.diferencia !== 0).length,
      turnoAbierto:     list.find(t => t.estado === 'abierto') ?? null,
    };
  });

  openDetail(t: TurnoCaja): void {
    this.selectedTurno.set(t);
    this.showDetail.set(true);
  }

  closeDetail(): void {
    this.showDetail.set(false);
    this.selectedTurno.set(null);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(value);
  }

  getEstadoClass(estado: TurnoCaja['estado']): string {
    const map: Record<TurnoCaja['estado'], string> = {
      abierto:  'estado-abierto',
      cerrado:  'estado-cerrado',
      cuadrado: 'estado-cuadrado',
    };
    return map[estado];
  }

  getEstadoLabel(estado: TurnoCaja['estado']): string {
    const map: Record<TurnoCaja['estado'], string> = {
      abierto:  '🟢 Abierto',
      cerrado:  '🔴 Con diferencia',
      cuadrado: '✅ Cuadrado',
    };
    return map[estado];
  }

  exportarExcel() {
    const dataToExport = this.turnos().map(t => ({
      'ID Turno': t.id,
      'Garitero': t.garitero,
      'Apertura': `${t.fechaApertura} ${t.horaApertura}`,
      'Cierre': t.fechaCierre ? `${t.fechaCierre} ${t.horaCierre}` : 'En curso',
      'Estado': t.estado.toUpperCase(),
      'Saldo Inicial': t.saldoInicial,
      'Ventas Totales': t.totalVentas,
      'Efectivo Recibido': t.totalEfectivo,
      'Transferencias': t.totalTransferencia,
      'Deudas Fiadas': t.totalDeudas,
      'Gastos Operativos': t.gastos,
      'Saldo Final Entregado': t.saldoFinal,
      'Diferencia (Descuadre)': t.diferencia,
      'Observaciones': t.observaciones || 'N/A'
    }));
    
    const fecha = new Date().toISOString().split('T')[0];
    this.excel.exportAsExcelFile(dataToExport, `Reporte_Caja_JcueScore_${fecha}`);
  }
}
