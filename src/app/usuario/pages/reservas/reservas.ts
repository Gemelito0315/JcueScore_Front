import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-usuario-reservas',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reservas.html',
  styleUrl: './reservas.scss'
})
export class UsuarioReservas {
  private fb = new FormBuilder();

  showForm = signal(false);
  reservas = signal([
    { id: 1, tipo: 'Billar', mesa: 'Mesa 3', fecha: '2026-04-10', hora: '15:00 - 17:00', estado: 'confirmada' },
    { id: 2, tipo: 'Bolirama', mesa: 'Máquina 1', fecha: '2026-04-05', hora: '18:00 - 19:00', estado: 'completada' },
  ]);

  form = this.fb.group({
    tipo: ['billar', Validators.required],
    fecha: ['', Validators.required],
    horaInicio: ['', Validators.required],
    horaFin: ['', Validators.required],
    notas: [''],
  });

  tiposJuego = ['Billar', 'Tejo', 'Bolirama'];

  getEstadoClass(estado: string) {
    return { confirmada: 'badge-cyan', completada: 'badge-green', cancelada: 'badge-red' }[estado] ?? 'badge-gray';
  }

  cancelar(id: number) {
    this.reservas.update(r => r.filter(x => x.id !== id));
  }

  guardar() {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.reservas.update(r => [...r, {
      id: Date.now(), tipo: v.tipo ?? 'Billar', mesa: 'Por asignar',
      fecha: v.fecha ?? '', hora: `${v.horaInicio} - ${v.horaFin}`, estado: 'confirmada'
    }]);
    this.showForm.set(false);
    this.form.reset({ tipo: 'billar' });
  }
}
