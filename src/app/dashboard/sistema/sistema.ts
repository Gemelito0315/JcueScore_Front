import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sistema',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sistema.html',
  styleUrl: './sistema.scss'
})
export class Sistema implements OnInit {
  private http = inject(HttpClient);
  private fb = new FormBuilder();

  maintenanceMode = signal(false);
  confirmModal = signal(false);
  saved = signal(false);
  loading = signal(false);

  form = this.fb.group({
    message: ['Estamos realizando mejoras en el sistema. Volveremos pronto.'],
    estimatedTime: [''],
  });

  ngOnInit() {
    this.http.get<any>(`${environment.apiBaseUrl}/maintenance`).subscribe(data => {
      this.maintenanceMode.set(data.active);
      this.form.patchValue({ message: data.message, estimatedTime: data.estimatedTime });
    });
  }

  toggleMaintenance() {
    this.confirmModal.set(true);
  }

  confirmToggle() {
    this.loading.set(true);
    const newState = !this.maintenanceMode();
    this.http.put(`${environment.apiBaseUrl}/maintenance`, {
      active: newState,
      message: this.form.value.message,
      estimatedTime: this.form.value.estimatedTime,
    }).subscribe({
      next: () => {
        this.maintenanceMode.set(newState);
        this.confirmModal.set(false);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  saveSettings() {
    this.loading.set(true);
    this.http.put(`${environment.apiBaseUrl}/maintenance`, {
      active: this.maintenanceMode(),
      message: this.form.value.message,
      estimatedTime: this.form.value.estimatedTime,
    }).subscribe({
      next: () => { this.saved.set(true); this.loading.set(false); setTimeout(() => this.saved.set(false), 2000); },
      error: () => this.loading.set(false)
    });
  }
}
