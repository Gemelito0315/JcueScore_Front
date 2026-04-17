import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../auth/services/auth';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-deudas-usuario',
  imports: [CommonModule],
  templateUrl: './deudas-usuario.html',
  styleUrl: './deudas-usuario.scss'
})
export class DeudasUsuario implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  deudas = signal<any[]>([]);
  currentUser = this.auth.currentUser;

  ngOnInit() {
    const userId = this.currentUser()?.id;
    if (!userId) return;
    this.http.get<any[]>(`${API}/deudas/usuario/${userId}`).subscribe({
      next: d => this.deudas.set(d),
      error: () => this.deudas.set([])
    });
  }

  get totalPendiente() {
    return this.deudas()
      .filter(d => d.estado !== 'pagada')
      .reduce((a, d) => a + (parseFloat(d.monto) - parseFloat(d.montoPagado)), 0);
  }

  getEstadoColor(estado: string) {
    return { pendiente: '#f87171', parcial: '#f59e0b', pagada: '#34d399' }[estado] ?? '#64748b';
  }

  getPendiente(d: any) {
    return parseFloat(d.monto) - parseFloat(d.montoPagado);
  }
}
