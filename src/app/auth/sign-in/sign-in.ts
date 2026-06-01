import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn {
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);

  hidePassword = true;
  errorMsg = '';
  successMsg = '';
  isLoading = signal(false);
  docTypes = ['CC', 'TI', 'CE', 'PP'];

  registerForm = this.fb.group({
    name:      ['', [Validators.required, Validators.minLength(2)]],
    lastName:  ['', [Validators.required, Validators.minLength(2)]],
    docType:   ['CC', Validators.required],
    docNumber: ['', [Validators.required, Validators.minLength(4)]],
    email:     ['', [Validators.required, Validators.email]],
    password:  ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() { return this.registerForm.controls; }

  onSubmit() {
    this.errorMsg = '';
    this.successMsg = '';

    if (this.registerForm.invalid) {
      // Marcar todos los campos para mostrar errores de validación
      this.registerForm.markAllAsTouched();
      this.errorMsg = 'Por favor completa todos los campos correctamente.';
      return;
    }

    this.isLoading.set(true);
    const payload = {
      ...this.registerForm.value,
      isActive: true,
      roleIds: [2], // Rol Usuario por defecto
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMsg = '¡Registro exitoso! Por favor, revisa tu correo electrónico para verificar tu cuenta.';
        setTimeout(() => this.router.navigate(['/auth/login']), 4000);
      },
      error: (err) => {
        this.isLoading.set(false);
        // NestJS puede enviar message como string o array
        const msg = err.error?.message;
        if (Array.isArray(msg)) {
          this.errorMsg = msg[0];
        } else {
          this.errorMsg = msg || 'Error al registrar usuario. Intenta con otro correo.';
        }
      }
    });
  }
}
