import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../auth/services/auth';

@Component({
  selector: 'app-usuario-perfil',
  imports: [ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class UsuarioPerfil {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private fb = new FormBuilder();

  currentUser = this.auth.currentUser;
  saved = signal(false);
  editMode = signal(false);
  avatarUrl = signal<string | null>(localStorage.getItem('avatarUrl'));

  form = this.fb.group({
    name: [this.currentUser()?.name ?? '', Validators.required],
    lastName: [this.currentUser()?.lastName ?? '', Validators.required],
    email: [this.currentUser()?.email ?? '', Validators.required],
    docType: [this.currentUser()?.docType ?? ''],
    docNumber: [this.currentUser()?.docNumber ?? ''],
  });

  passForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  onAvatarChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const url = e.target.result;
      this.avatarUrl.set(url);
      localStorage.setItem('avatarUrl', url);
      // Notificar al layout padre
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
    this.saved.set(true);
    this.editMode.set(false);
    setTimeout(() => this.saved.set(false), 2500);
  }

  changePassword() {
    if (this.passForm.invalid) return;
    this.passForm.reset();
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }
}
