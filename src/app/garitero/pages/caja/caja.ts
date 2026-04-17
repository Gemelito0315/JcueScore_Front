import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

interface GastoInterno {
  id: number; descripcion: string; monto: number; tipo: string; hora: string;
}

@Component({
  selector: 'app-caja',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './caja.html',
  styleUrl: './caja.scss'
})
export class Caja {
  private fb = new FormBuilder();
  gastos = signal<GastoInterno[]>([]);
  showModal = signal(false);

  form = this.fb.group({
    descripcion: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(1)]],
    tipo: ['consumo_propietario'],
  });

  tipos = [
    { value: 'consumo_propietario', label: '🍺 Consumo propietario' },
    { value: 'gasto_operativo', label: '🔧 Gasto operativo' },
    { value: 'otro', label: '📝 Otro' },
  ];

  get totalGastos() { return this.gastos().reduce((a, g) => a + g.monto, 0); }

  save() {
    if (this.form.invalid) return;
    const val = this.form.value;
    this.gastos.update(gs => [...gs, {
      id: Date.now(), descripcion: val.descripcion ?? '', monto: val.monto ?? 0,
      tipo: val.tipo ?? '', hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    }]);
    this.showModal.set(false);
    this.form.reset({ tipo: 'consumo_propietario', monto: 0 });
  }

  delete(id: number) { this.gastos.update(gs => gs.filter(g => g.id !== id)); }

  getTipoLabel(tipo: string) { return this.tipos.find(t => t.value === tipo)?.label ?? tipo; }
}
