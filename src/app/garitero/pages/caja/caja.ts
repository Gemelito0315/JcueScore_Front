import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

const API = 'http://localhost:3000';

interface GastoInterno { id: number; descripcion: string; monto: number; tipo: string; hora: string; }

interface ResumenTurno {
  turno: any;
  totalGastos: number;
  totalIngresosEfectivo: number;
  totalPagosDeudasEfectivo: number;
  totalEfectivoEntrante: number;
  sueldoEstimado: number;
  efectivoEsperado: number;
  horasTrabajadas: number;
}

@Component({
  selector: 'app-caja',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './caja.html',
  styleUrl: './caja.scss'
})
export class Caja implements OnInit {
  private fb = new FormBuilder();
  private http = inject(HttpClient);
  private router = inject(Router);
  
  gastos = signal<GastoInterno[]>([]);
  showModal = signal(false);
  turnoId = signal<number | null>(null);
  resumen = signal<ResumenTurno | null>(null);

  form = this.fb.group({
    descripcion: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(1)]],
    tipo: ['gasto_operativo'],
  });

  tipos = [
    { value: 'consumo_propietario', label: '🍺 Consumo propietario' },
    { value: 'gasto_operativo', label: '🔧 Gasto operativo' },
    { value: 'pago_proveedor', label: '📦 Pago a Proveedor' },
    { value: 'otro', label: '📝 Otro' },
  ];

  ngOnInit() {
    this.http.get<any>(`${API}/operaciones/turno/activo`).subscribe({
      next: (t) => {
        if (t) {
          this.turnoId.set(t.id);
          this.loadGastos(t.id);
          this.loadResumen(t.id);
        }
      }
    });
  }

  loadGastos(tId: number) {
    this.http.get<GastoInterno[]>(`${API}/operaciones/turno/${tId}/gastos`).subscribe({
      next: (gs) => this.gastos.set(gs)
    });
  }

  loadResumen(tId: number) {
    this.http.get<ResumenTurno>(`${API}/operaciones/turno/${tId}/resumen`).subscribe({
      next: (res) => this.resumen.set(res)
    });
  }

  get totalGastos() { return this.gastos().reduce((a, g) => a + Number(g.monto), 0); }

  saveGasto() {
    if (this.form.invalid || !this.turnoId()) return;
    const body = {
      descripcion: this.form.value.descripcion!,
      monto: Number(this.form.value.monto),
      tipo: this.form.value.tipo!
    };
    this.http.post<GastoInterno>(`${API}/operaciones/turno/${this.turnoId()}/gastos`, body).subscribe({
      next: (g) => {
        this.gastos.update(gs => [g, ...gs]);
        this.showModal.set(false);
        this.form.reset({ tipo: 'gasto_operativo', monto: 0 });
        this.loadResumen(this.turnoId()!);
      }
    });
  }

  deleteGasto(id: number) {
    this.http.delete(`${API}/operaciones/gastos/${id}`).subscribe({
      next: () => {
        this.gastos.update(gs => gs.filter(g => g.id !== id));
        this.loadResumen(this.turnoId()!);
      }
    });
  }

  getTipoLabel(tipo: string) { return this.tipos.find(t => t.value === tipo)?.label ?? tipo; }
}
