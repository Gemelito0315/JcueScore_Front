import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { DEFAULT_VENUE_ID } from '../../core/constants';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-mesas',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mesas.html',
  styleUrl: './mesas.scss'
})
export class Mesas implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  recursos = signal<any[]>([]);
  tiposJuego = signal<any[]>([]);
  showModal = signal(false);
  editingId = signal<number | null>(null);
  loading = signal(false);
  previewImg = signal<string | null>(null);
  filterTipo = signal<string>('todos');

  form = this.fb.group({
    code: ['', Validators.required],
    gameTypeId: [null, Validators.required],
    venueId: [DEFAULT_VENUE_ID, Validators.required],
    pricePerHour: [0, Validators.required],
    status: ['available'],
    isActive: [true],
    specifications: [null],
  });

  statusOptions = [
    { value: 'available', label: 'Disponible', color: '#a6e3a1' },
    { value: 'occupied', label: 'Ocupada', color: '#fab387' },
    { value: 'maintenance', label: 'Mantenimiento', color: '#f38ba8' },
  ];

  ngOnInit() {
    this.loadRecursos();
    this.loadTiposJuego();
  }

  loadTiposJuego() {
    this.http.get<any[]>(`${API}/tipos-juego`).subscribe({
      next: d => this.tiposJuego.set(d || []),
      error: err => console.error('Error loading tipos de juego:', err)
    });
  }

  loadRecursos() {
    this.http.get<any[]>(`${API}/recursos`).subscribe({
      next: d => this.recursos.set(d || []),
      error: err => console.error('Error loading recursos:', err)
    });
  }

  get filteredRecursos() {
    const f = this.filterTipo();
    if (f === 'todos') return this.recursos();
    return this.recursos().filter(r => r.gameType?.name?.toLowerCase() === f);
  }

  openCreate() {
    this.editingId.set(null);
    this.previewImg.set(null);
    this.form.reset({ status: 'available', venueId: DEFAULT_VENUE_ID, pricePerHour: 0, isActive: true });
    this.showModal.set(true);
  }

  openEdit(r: any) {
    this.editingId.set(r.id);
    this.previewImg.set(null);
    this.form.enable();
    this.form.patchValue({
      ...r,
      gameTypeId: r.gameType?.id,
      venueId: r.venueId,
    });
    this.showModal.set(true);
  }

  onImageChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => this.previewImg.set(e.target.result);
    reader.readAsDataURL(file);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = this.form.value;
    // Remove specifications if null to satisfy DTO validation
    if (val.specifications === null) {
      delete val.specifications;
    }
    const payload = {
      ...val,
      // Preserve the venueId from the form (do not force DEFAULT_VENUE_ID)
      venueId: Number(val.venueId) || DEFAULT_VENUE_ID,
      gameTypeId: val.gameTypeId != null ? Number(val.gameTypeId) : null,
      pricePerHour: Number(val.pricePerHour),
      imageUrl: this.previewImg() || null,
    };
    const req = this.editingId()
      ? this.http.put(`${API}/recursos/${this.editingId()}`, payload)
      : this.http.post(`${API}/recursos`, payload);

    req.subscribe({
      next: () => { this.loadRecursos(); this.showModal.set(false); this.loading.set(false); },
      error: (err) => { console.error(err); this.loading.set(false); }
    });
  }

  delete(id: number) {
    if (!confirm('¿Eliminar esta mesa/recurso?')) return;
    this.http.delete(`${API}/recursos/${id}`).subscribe(() => this.loadRecursos());
  }

  abrirMesa(r: any) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/mesa', r.code])
    );
    window.open(url, '_blank');
  }

  getStatusColor(status: string) {
    return this.statusOptions.find(s => s.value === status)?.color ?? '#8892a4';
  }

  getStatusLabel(status: string) {
    return this.statusOptions.find(s => s.value === status)?.label ?? status;
  }
}
