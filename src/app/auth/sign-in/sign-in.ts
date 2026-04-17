import { Component, inject } from '@angular/core';
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
  docTypes = ['CC', 'TI', 'CE', 'PP'];

  registerForm = this.fb.group({
    name: ['', Validators.required],
    lastName: ['', Validators.required],
    docType: ['CC', Validators.required],
    docNumber: ['', Validators.required],
    email: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit() {
    if (this.registerForm.valid) {
      this.errorMsg = '';
      const payload = {
        ...this.registerForm.value,
        isActive: true,
        roleIds: [2],
      };

      this.authService.register(payload).subscribe({
        next: () => this.router.navigate(['/auth/login']),
        error: (err) => {
          this.errorMsg = err.error?.message || 'Error al registrar usuario';
        }
      });
    }
  }
}
