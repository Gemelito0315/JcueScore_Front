import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify.html',
  styleUrl: './verify.scss'
})
export class VerifyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  
  status = signal<'loading' | 'success' | 'error'>('loading');
  message = signal('Verificando tu cuenta...');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (!token) {
        this.status.set('error');
        this.message.set('Enlace de verificación inválido. Falta el token.');
        return;
      }

      this.http.post<{message: string}>(`http://localhost:3000/auth/verify`, { token })
        .subscribe({
          next: (res) => {
            this.status.set('success');
            this.message.set(res.message);
          },
          error: (err) => {
            this.status.set('error');
            this.message.set(err.error?.message || 'Error al verificar la cuenta. El enlace puede haber expirado.');
          }
        });
    });
  }
}
