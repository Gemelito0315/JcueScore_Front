import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../auth/services/auth';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-usuario-perfil',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class UsuarioPerfil implements OnInit {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  currentUser = this.auth.currentUser;
  saved       = signal(false);
  savedPass   = signal(false);
  editMode    = signal(false);
  saving      = signal(false);
  savingPass  = signal(false);
  errorMsg    = signal<string | null>(null);
  avatarUrl   = signal<string | null>(localStorage.getItem('avatarUrl'));

  form = this.fb.group({
    name:      [this.currentUser()?.name      ?? '', Validators.required],
    lastName:  [this.currentUser()?.lastName  ?? '', Validators.required],
    email:     [this.currentUser()?.email     ?? '', [Validators.required, Validators.email]],
    docType:   [this.currentUser()?.docType   ?? ''],
    docNumber: [this.currentUser()?.docNumber ?? ''],
  });

  passForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit() {
    // Recargar datos actuales del perfil desde el servidor
    this.http.get<any>(`${API}/users/me`).subscribe({
      next: (u) => {
        this.form.patchValue({
          name:      u.name      ?? '',
          lastName:  u.lastName  ?? '',
          email:     u.email     ?? '',
          docType:   u.docType   ?? '',
          docNumber: u.docNumber ?? '',
        });
      },
      error: () => {} // mantener valores del localStorage
    });
  }

  onAvatarChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const url = e.target.result;
      this.avatarUrl.set(url);
      localStorage.setItem('avatarUrl', url);
      window.dispatchEvent(new Event('avatarUpdated'));
    };
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    this.avatarUrl.set(null);
    localStorage.removeItem('avatarUrl');
    window.dispatchEvent(new Event('avatarUpdated'));
  }

  saveProfile() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMsg.set(null);
    this.http.put<any>(`${API}/users/me`, this.form.value).subscribe({
      next: (u) => {
        this.auth.updateCurrentUser(u);
        this.saved.set(true);
        this.editMode.set(false);
        this.saving.set(false);
        setTimeout(() => this.saved.set(false), 2500);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Error al guardar el perfil');
        this.saving.set(false);
      }
    });
  }

  changePassword() {
    if (this.passForm.invalid) return;
    this.savingPass.set(true);
    this.http.post(`${API}/auth/change-password`, {
      userId: this.currentUser()?.id,
      currentPassword: this.passForm.value.currentPassword,
      newPassword: this.passForm.value.newPassword,
    }).subscribe({
      next: () => {
        this.passForm.reset();
        this.savedPass.set(true);
        this.savingPass.set(false);
        setTimeout(() => this.savedPass.set(false), 2500);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Error al cambiar la contraseña');
        this.savingPass.set(false);
      }
    });
  }
}
