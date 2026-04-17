import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-turno',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './turno.html',
  styleUrl: './turno.scss'
})
export class Turno implements OnInit, OnDestroy {
  private fb = new FormBuilder();

  turnoActivo = signal(false);
  horaInicio = signal<Date | null>(null);
  horaFin = signal<Date | null>(null);
  duracionSegundos = signal(0);
  private timerInterval: any;

  // Configuración del turno
  formApertura = this.fb.group({
    baseCaja: [100000, [Validators.required, Validators.min(0)]],
    valorHora: [7000, [Validators.required, Validators.min(0)]],
    notasApertura: [''],
  });

  formCierre = this.fb.group({
    efectivoContado: [0, [Validators.required, Validators.min(0)]],
    notasCierre: [''],
  });

  // Resumen del día (se llenará con datos reales)
  resumenDia = signal({
    ventasEfectivo: 0,
    ventasTransferencia: 0,
    deudasCobradas: 0,
    gastosInternos: 0,
    deudasPendientes: 0,
  });

  ngOnInit() {
    // Restaurar turno si estaba activo
    const turnoGuardado = localStorage.getItem('turnoActivo');
    if (turnoGuardado) {
      const t = JSON.parse(turnoGuardado);
      this.turnoActivo.set(true);
      this.horaInicio.set(new Date(t.horaInicio));
      this.formApertura.patchValue({ baseCaja: t.baseCaja, valorHora: t.valorHora });
      this.iniciarTimer();
    }
  }

  ngOnDestroy() { clearInterval(this.timerInterval); }

  iniciarTurno() {
    if (this.formApertura.invalid) return;
    const ahora = new Date();
    this.horaInicio.set(ahora);
    this.turnoActivo.set(true);
    localStorage.setItem('turnoActivo', JSON.stringify({
      horaInicio: ahora.toISOString(),
      baseCaja: this.formApertura.value.baseCaja,
      valorHora: this.formApertura.value.valorHora,
    }));
    this.iniciarTimer();
  }

  iniciarTimer() {
    this.timerInterval = setInterval(() => {
      if (this.horaInicio()) {
        const diff = Math.floor((Date.now() - this.horaInicio()!.getTime()) / 1000);
        this.duracionSegundos.set(diff);
      }
    }, 1000);
  }

  cerrarTurno() {
    if (this.formCierre.invalid) return;
    this.horaFin.set(new Date());
    clearInterval(this.timerInterval);
    localStorage.removeItem('turnoActivo');
  }

  resetTurno() {
    this.turnoActivo.set(false);
    this.horaInicio.set(null);
    this.horaFin.set(null);
    this.duracionSegundos.set(0);
    this.formCierre.reset({ efectivoContado: 0 });
  }

  get horasTrabajadas() {
    return this.duracionSegundos() / 3600;
  }

  get salarioCalculado() {
    return Math.round(this.horasTrabajadas * (this.formApertura.value.valorHora ?? 0));
  }

  get duracionFormateada() {
    const s = this.duracionSegundos();
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const seg = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${seg}`;
  }

  get totalIngresos() {
    const r = this.resumenDia();
    return r.ventasEfectivo + r.ventasTransferencia + r.deudasCobradas;
  }

  get totalEsperadoEnCaja() {
    const r = this.resumenDia();
    return (this.formApertura.value.baseCaja ?? 0) + r.ventasEfectivo + r.deudasCobradas - r.gastosInternos - this.salarioCalculado;
  }

  get diferenciaCaja() {
    return (this.formCierre.value.efectivoContado ?? 0) - this.totalEsperadoEnCaja;
  }

  get estadoCuadre() {
    const diff = this.diferenciaCaja;
    if (diff === 0) return { texto: '✅ Caja cuadrada perfectamente', color: '#34d399' };
    if (diff > 0) return { texto: `⚠️ Sobran $${Math.abs(diff).toLocaleString()}`, color: '#f59e0b' };
    return { texto: `❌ Faltan $${Math.abs(diff).toLocaleString()}`, color: '#f87171' };
  }
}
