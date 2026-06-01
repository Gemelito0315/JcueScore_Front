import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-configuracion',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss'
})
export class Configuracion implements OnInit {
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  saved        = signal(false);
  loading      = signal(false);
  logoPreview  = signal<string | null>(null);
  errorMsg     = signal<string | null>(null);

  form = this.fb.group({
    nombre:              ['JcueScore - Billar JJ', Validators.required],
    slogan:              ['Sports Center'],
    direccion:           ['Calle 45 # 23-10, Bogotá'],
    telefono:            ['3001234567'],
    email:               ['contacto@jcuescore.com'],
    horarioApertura:     ['08:00'],
    horarioCierre:       ['22:00'],
    moneda:              ['COP'],
    precioDefaultBillar: [15000],
    precioDefaultTejo:   [12000],
    precioDefaultBolirama:[10000],
    puntosXPartida:      [10],
    puntosXHora:         [5],
    metaBronce:          [100],
    metaPlata:           [300],
    metaOro:             [600],
  });

  ngOnInit() {
    this.http.get<any>(`${API}/configuracion`).subscribe({
      next: (cfg) => {
        if (cfg) this.form.patchValue(cfg);
        if (cfg?.logoUrl) this.logoPreview.set(cfg.logoUrl);
      },
      error: () => {} // usar valores default del formulario
    });
  }

  onLogoChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => this.logoPreview.set(e.target.result);
    reader.readAsDataURL(file);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    const payload = { ...this.form.value };
    if (this.logoPreview()) (payload as any).logoUrl = this.logoPreview();

    this.http.post(`${API}/configuracion`, payload).subscribe({
      next: () => {
        this.saved.set(true);
        this.loading.set(false);
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: (err) => {
        // Intentar PUT si POST falla (algunos backends usan PUT para upsert)
        this.http.put(`${API}/configuracion`, payload).subscribe({
          next: () => {
            this.saved.set(true);
            this.loading.set(false);
            setTimeout(() => this.saved.set(false), 2500);
          },
          error: (e) => {
            this.errorMsg.set(e?.error?.message ?? 'Error al guardar la configuración');
            this.loading.set(false);
          }
        });
      }
    });
  }
}
