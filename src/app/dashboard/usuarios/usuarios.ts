import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-usuarios',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss'
})
export class Usuarios implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  usuarios = signal<any[]>([]);
  showModal = signal(false);
  editingId = signal<number | null>(null);
  loading = signal(false);

  form = this.fb.group({
    name: ['', Validators.required],
    lastName: ['', Validators.required],
    docType: ['CC', Validators.required],
    docNumber: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    isActive: [true],
    roleIds: [[1]],
  });

  docTypes = ['CC', 'TI', 'CE', 'PP'];
  roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Usuario' },
    { id: 3, name: 'Garitero' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any[]>(`${API}/users`).subscribe(data => this.usuarios.set(data));
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ docType: 'CC', isActive: true, roleIds: [2] });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  openEdit(u: any) {
    this.editingId.set(u.id);
    this.form.patchValue({
      name: u.name, lastName: u.lastName, docType: u.docType,
      docNumber: u.docNumber, email: u.email, isActive: u.isActive,
      roleIds: u.roles?.map((r: any) => r.id) ?? [2],
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.showModal.set(true);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = this.form.value;
    const roleIds = Array.isArray(val.roleIds) ? val.roleIds.map(Number) : [Number(val.roleIds)];
    const payload: any = { ...val, roleIds };
    if (!payload.password) delete payload.password;

    const req = this.editingId()
      ? this.http.put(`${API}/users/${this.editingId()}`, payload)
      : this.http.post(`${API}/users/register`, payload);

    req.subscribe({
      next: () => { this.load(); this.showModal.set(false); this.loading.set(false); },
      error: (err) => { console.error(err); this.loading.set(false); }
    });
  }

  delete(id: number) {
    if (!confirm('¿Eliminar este usuario?')) return;
    this.http.delete(`${API}/users/${id}`).subscribe(() => this.load());
  }

  toggleActive(u: any) {
    const roleIds = u.roles?.map((r: any) => r.id) ?? [2];
    this.http.put(`${API}/users/${u.id}`, { isActive: !u.isActive, roleIds })
      .subscribe(() => this.load());
  }
}
