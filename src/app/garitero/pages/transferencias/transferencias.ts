import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000';

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
export class Transferencias implements OnInit {
  private fb = new FormBuilder();
  private http = inject(HttpClient);

  transferencias = signal<Transferencia[]>([]);
  showModal = signal(false);
  fotoPreview = signal<string | null>(null);
  turnoId = signal<number | null>(null);

  form = this.fb.group({
    cliente: ['', Validators.required],
    monto: [0, [Validators.required, Validators.min(1)]],
    concepto: ['Pago partida'],
    foto: [''],
  });

  ngOnInit() {
    this.http.get<any>(`${API}/operaciones/turno/activo`).subscribe({
      next: (t) => {
        if (t) {
          this.turnoId.set(t.id);
          this.loadTransferencias(t.id);
        }
      }
    });
  }

  loadTransferencias(tId: number) {
    this.http.get<Transferencia[]>(`${API}/operaciones/turno/${tId}/transferencias`).subscribe({
      next: (ts) => this.transferencias.set(ts)
    });
  }

  get totalTransferencias() {
    return this.transferencias().reduce((a, t) => a + Number(t.monto), 0);
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
    if (this.form.invalid || !this.turnoId()) return;
    const val = this.form.value;
    const body = {
      cliente: val.cliente!,
      monto: Number(val.monto),
      concepto: val.concepto!,
      foto: this.fotoPreview() ?? undefined
    };

    this.http.post<Transferencia>(`${API}/operaciones/turno/${this.turnoId()}/transferencias`, body).subscribe({
      next: (t) => {
        this.transferencias.update(ts => [t, ...ts]);
        this.showModal.set(false);
        this.fotoPreview.set(null);
        this.form.reset({ concepto: 'Pago partida', monto: 0 });
      }
    });
  }

  delete(id: number) {
    this.http.delete(`${API}/operaciones/transferencias/${id}`).subscribe({
      next: () => this.transferencias.update(ts => ts.filter(t => t.id !== id))
    });
  }
}
