import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ExcelExportService } from '../../../services/excel-export.service';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-turno',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './turno.html',
  styleUrl: './turno.scss'
})
export class Turno implements OnInit, OnDestroy {
  private fb = new FormBuilder();
  private http = inject(HttpClient);
  private router = inject(Router);
  private excelService = inject(ExcelExportService);

  turnoId = signal<number | null>(null);
  turnoActivo = signal(false);
  horaInicio = signal<Date | null>(null);
  horaFin = signal<Date | null>(null);
  duracionSegundos = signal(0);
  loadingResumen = signal(false);
  private timerInterval: any;
  private resumenInterval: any;

  formApertura = this.fb.group({
    baseCaja: [100000, [Validators.required, Validators.min(0)]],
    valorHora: [7000, [Validators.required, Validators.min(0)]],
    notasApertura: [''],
  });

  formCierre = this.fb.group({
    efectivoContado: [0, [Validators.required, Validators.min(0)]],
    notasCierre: [''],
  });

  resumenDia = signal({
    ventasEfectivo: 0,
    ventasTransferencia: 0,
    deudasCobradas: 0,
    gastosInternos: 0,
    deudasPendientes: 0,
    efectivoEsperado: 0,
  });

  reporteDetallado = signal<{ productosVendidos: any[], mesasCobradas: any[], tiempoMesas: any[], deudasCobradasList: any[] } | null>(null);
  mostrarTrilla = signal(false);

  ngOnInit() {
    this.http.get<any>(`${API}/operaciones/turno/activo`).subscribe({
      next: (t) => {
        if (t) {
          this.turnoId.set(t.id);
          this.turnoActivo.set(true);
          // Parsear la fecha tal como viene del backend para evitar bugs de zona horaria
          const fechaInicio = new Date(t.horaInicio);
          this.horaInicio.set(fechaInicio);
          this.formApertura.patchValue({
            baseCaja: Number(t.baseCaja),
            valorHora: Number(t.valorHora),
            notasApertura: t.notasApertura
          });
          // Calcular duración inicial en base al serverTime para evitar desincronización de relojes
          const serverTime = new Date(t.serverTime).getTime();
          const diffSegundos = Math.floor((serverTime - fechaInicio.getTime()) / 1000);
          this.duracionSegundos.set(Math.max(0, diffSegundos));

          this.iniciarTimer();
          this.cargarResumen(t.id);
          // Refrescar resumen cada 30 segundos
          this.resumenInterval = setInterval(() => this.cargarResumen(this.turnoId()!), 30000);
        }
      },
      error: () => {}
    });
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
    clearInterval(this.resumenInterval);
  }

  cargarResumen(turnoId: number) {
    this.loadingResumen.set(true);
    this.http.get<any>(`${API}/operaciones/turno/${turnoId}/reporte-detallado`).subscribe({
      next: (res) => {
        this.resumenDia.set({
          ventasEfectivo:      Number(res.totalIngresosEfectivo    || 0),
          ventasTransferencia: Number(res.totalTransferenciasEntrantes || 0),
          deudasCobradas:      Number(res.totalPagosDeudasEfectivo || 0),
          gastosInternos:      Number(res.totalGastos              || 0),
          deudasPendientes:    Number(res.totalDeudasPendientes    || 0),
          efectivoEsperado:    Number(res.efectivoEsperado         || 0),
        });
        this.reporteDetallado.set({
          productosVendidos: res.productosVendidos || [],
          mesasCobradas: res.mesasCobradas || [],
          tiempoMesas: res.tiempoMesas || [],
          deudasCobradasList: res.deudasCobradasList || []
        });
        this.loadingResumen.set(false);
      },
      error: () => this.loadingResumen.set(false)
    });
  }

  iniciarTurno() {
    if (this.formApertura.invalid) return;
    const body = {
      baseCaja:      Number(this.formApertura.value.baseCaja),
      valorHora:     Number(this.formApertura.value.valorHora),
      notasApertura: this.formApertura.value.notasApertura
    };

    this.http.post<any>(`${API}/operaciones/turno/abrir`, body).subscribe({
      next: (t) => {
        this.turnoId.set(t.id);
        const fechaInicio = new Date(t.horaInicio);
        this.horaInicio.set(fechaInicio);
        this.turnoActivo.set(true);
        const serverTime = new Date(t.serverTime).getTime();
        const diffSegundos = Math.floor((serverTime - fechaInicio.getTime()) / 1000);
        this.duracionSegundos.set(Math.max(0, diffSegundos));

        this.iniciarTimer();
        this.cargarResumen(t.id);
        this.resumenInterval = setInterval(() => this.cargarResumen(this.turnoId()!), 30000);
      },
      error: (e) => {
        const msg = e.error?.message || 'Error al abrir turno. ¿Ya hay un turno abierto?';
        alert(msg);
      }
    });
  }

  iniciarTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.horaInicio()) {
        this.duracionSegundos.update(s => s + 1); // Incrementar 1 segundo localmente
      }
    }, 1000);
  }

  // Lógica de Cierre
  get diferenciaCaja() {
    return (this.formCierre.value.efectivoContado ?? 0) - this.totalEsperadoEnCaja;
  }

  cerrarTurno() {
    if (this.formCierre.invalid) return;
    
    const diff = this.diferenciaCaja;
    let advertencia = '';
    if (diff < 0) advertencia = `ATENCIÓN: Te faltan $${Math.abs(diff)}. `;
    if (diff > 0) advertencia = `NOTA: Te sobran $${diff}. `;

    if (diff !== 0) {
      if (!confirm(`${advertencia}\n\n¿Deseas continuar con el cierre de caja y registrar este descuadre?`)) return;
    } else {
      if (!confirm('¿Estás seguro de que deseas cerrar el turno? Ya no podrás hacer ventas ni movimientos.')) return;
    }

    const payload = {
      efectivoContado: this.formCierre.value.efectivoContado,
      notasCierre: `Diferencia: $${diff}. ` + (this.formCierre.value.notasCierre || '')
    };

    this.http.post(`${API}/operaciones/turno/${this.turnoId()}/cerrar`, payload).subscribe({
      next: () => {
        alert('✅ Turno cerrado exitosamente. Has finalizado tu jornada.');
        this.resetTurno();
      },
      error: (err) => {
        alert('❌ Error al cerrar el turno: ' + (err.error?.message || 'Revisa la conexión.'));
      }
    });
  }

  exportarReporte() {
    const data = [
      {
        'Turno ID': this.turnoId(),
        'Fecha Inicio': this.horaInicio() ? this.horaInicio()!.toLocaleString() : '',
        'Base de Caja': this.formApertura.value.baseCaja,
        'Ventas Efectivo': this.resumenDia().ventasEfectivo,
        'Ventas Transferencia': this.resumenDia().ventasTransferencia,
        'Deudas Cobradas': this.resumenDia().deudasCobradas,
        'Consumo Propietario': this.resumenDia().gastosInternos,
        'Efectivo Esperado': this.totalEsperadoEnCaja,
        'Diferencia Reportada': this.diferenciaCaja,
        'Total Ingresos Reales': this.totalIngresos
      }
    ];
    this.excelService.exportAsExcelFile(data, `Reporte_Turno_${this.turnoId()}`);
  }

  resetTurno() {
    clearInterval(this.timerInterval);
    clearInterval(this.resumenInterval);
    this.turnoId.set(null);
    this.turnoActivo.set(false);
    this.horaInicio.set(null);
    this.horaFin.set(null);
    this.duracionSegundos.set(0);
    this.formApertura.reset({ baseCaja: 100000, valorHora: 7000, notasApertura: '' });
    this.formCierre.reset({ efectivoContado: 0, notasCierre: '' });
    this.resumenDia.set({ ventasEfectivo: 0, ventasTransferencia: 0, deudasCobradas: 0, gastosInternos: 0, deudasPendientes: 0, efectivoEsperado: 0 });
  }

  get horasTrabajadas()  { return this.duracionSegundos() / 3600; }
  get salarioCalculado() { return Math.round(this.horasTrabajadas * (this.formApertura.value.valorHora ?? 0)); }

  get duracionFormateada() {
    const s = this.duracionSegundos();
    const h   = Math.floor(s / 3600).toString().padStart(2, '0');
    const m   = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const seg = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${seg}`;
  }

  get totalIngresos() {
    const r = this.resumenDia();
    return r.ventasEfectivo + r.ventasTransferencia + r.deudasCobradas;
  }

  /** Usa el efectivoEsperado que calcula el backend para máxima precisión */
  get totalEsperadoEnCaja() {
    return this.resumenDia().efectivoEsperado;
  }

  toggleTrilla() {
    this.mostrarTrilla.update(v => !v);
  }
}
