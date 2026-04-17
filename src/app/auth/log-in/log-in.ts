import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoginInterface } from '../interfaces/login';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-log-in',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './log-in.html',
  styleUrl: './log-in.scss',
})
export class LogIn {
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);

  hidePassword = true;
  errorMsg = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.loginForm.valid) {
      this.errorMsg = '';
      const rawForm = this.loginForm.value as LoginInterface;

      this.authService.login(rawForm).subscribe({
        next: (res) => {
          const isAdmin = res.user?.roles?.some((r: any) => r.id === 1);
          const isGaritero = res.user?.roles?.some((r: any) => r.id === 3);
          if (isAdmin) {
            this.router.navigate(['/dashboard']);
          } else if (isGaritero) {
            this.router.navigate(['/garitero']);
          } else {
            this.http.get<any>('http://localhost:3000/maintenance').subscribe({
              next: (m) => this.router.navigate([m.active ? '/mantenimiento' : '/usuario']),
              error: () => this.router.navigate(['/usuario'])
            });
          }
        },
        error: () => this.errorMsg = 'Credenciales incorrectas'
      });
    }
  }
}
