import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { LoginInterface } from '../interfaces/login';
import { Auth } from '../services/auth';
import { environment } from '../../../environments/environment';

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
  private pushService = inject(PushNotificationService);

  hidePassword = true;
  errorMsg = '';
  isLoading = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    if (this.loginForm.valid) {
      this.errorMsg = '';
      this.isLoading.set(true);
      const rawForm = this.loginForm.value as LoginInterface;

      // Timeout global: si el login + navegación tarda más de 1s, forzamos apagar el loader
      const loaderTimeout = setTimeout(() => this.isLoading.set(false), 1000);

      this.authService.login(rawForm).subscribe({
        next: (res) => {
          // Iniciar suscripción de notificaciones al tener éxito el login
          this.pushService.subscribeToNotifications();

          const isAdmin = res.user?.roles?.some((r: any) => r.id === 1);
          const isGaritero = res.user?.roles?.some((r: any) => r.id === 3);

          const navigate = (route: string) => {
            clearTimeout(loaderTimeout);
            this.isLoading.set(false);
            this.router.navigate([route]);
          };

          if (isAdmin) {
            navigate('/dashboard');
          } else if (isGaritero) {
            navigate('/garitero');
          } else {
            // Timeout de 1 segundo para la llamada a /maintenance
            const maintenanceTimeout = setTimeout(() => navigate('/usuario'), 1000);

            this.http.get<any>(`${environment.apiBaseUrl}/maintenance`).subscribe({
              next: (m) => {
                clearTimeout(maintenanceTimeout);
                navigate(m.active ? '/mantenimiento' : '/usuario');
              },
              error: () => {
                clearTimeout(maintenanceTimeout);
                navigate('/usuario');
              }
            });
          }
        },
        error: (err) => {
          clearTimeout(loaderTimeout);
          this.isLoading.set(false);
          this.errorMsg = err.error?.message || 'Credenciales incorrectas';
        }
      });
    }
  }
}
