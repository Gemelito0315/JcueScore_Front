import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

interface Transferencia {
  id: number;
  cliente: string;
  monto: number;
  concepto: string;
  hora: string;
  foto: string | null;
}

@Component({
  selector: 'app-transferencias',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transferencias.html',
  styleUrl: './transferencias.scss'
})
export class Transferencias {
  private fb = new FormBuilder();

  transferencias = signal<Transferencia[]>([]);
  showModal = signal(false);
  fotoPreview = signal<string | null>(null);

  form = this.fb.group({
    cliente: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(1)]],
    concepto: ['Pago partida'],
    foto: [''],
  });

  get totalTransferencias() {
    return this.transferencias().reduce((a, t) => a + t.monto, 0);
  }

  onFotoChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.fotoPreview.set(e.target.result);
      this.form.patchValue({ foto: e.target.result });
    };
    reader.readAsDataURL(file);
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.value;
    this.transferencias.update(ts => [...ts, {
      id: Date.now(),
      cliente: val.cliente ?? '',
      monto: val.monto ?? 0,
      concepto: val.concepto ?? '',
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      foto: this.fotoPreview(),
    }]);
    this.showModal.set(false);
    this.fotoPreview.set(null);
    this.form.reset({ concepto: 'Pago partida', monto: 0 });
  }

  delete(id: number) {
    this.transferencias.update(ts => ts.filter(t => t.id !== id));
  }
}
