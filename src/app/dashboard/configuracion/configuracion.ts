import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-configuracion',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss'
})
export class Configuracion {
  private fb = new FormBuilder();

  saved = signal(false);
  logoPreview = signal<string | null>(null);

  form = this.fb.group({
    nombre: ['JcueScore - Billar JJ', Validators.required],
    slogan: ['Sports Center'],
    direccion: ['Calle 45 # 23-10, Bogotá'],
    telefono: ['3001234567'],
    email: ['contacto@jcuescore.com'],
    horarioApertura: ['08:00'],
    horarioCierre: ['22:00'],
    moneda: ['COP'],
    precioDefaultBillar: [15000],
    precioDefaultTejo: [12000],
    precioDefaultBolirama: [10000],
    puntosXPartida: [10],
    puntosXHora: [5],
    metaBronce: [100],
    metaPlata: [300],
    metaOro: [600],
  });

  onLogoChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => this.logoPreview.set(e.target.result);
    reader.readAsDataURL(file);
  }

  save() {
    if (this.form.invalid) return;
    // Conectar al back: POST /configuracion
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }
}
