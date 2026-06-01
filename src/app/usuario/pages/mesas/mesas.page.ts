import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-usuario-mesas',
  imports: [CommonModule],
  templateUrl: './mesas.page.html',
  styleUrl: './mesas.page.scss'
})
export class UsuarioMesasPage implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);

  mesas = signal<any[]>([]);
  pollId: any;

  ngOnInit() {
    this.cargarMesas();
    this.pollId = setInterval(() => this.cargarMesas(), 10000);
  }

  ngOnDestroy() {
    if (this.pollId) clearInterval(this.pollId);
  }

  cargarMesas() {
    this.http.get<any[]>(`${API}/recursos/todas`).subscribe({
      next: (data) => {
        // Filtrar mesas ocupadas
        const ocupadas = data.filter(m => m.status === 'occupied');
        this.mesas.set(ocupadas);
      },
      error: () => {}
    });
  }

  abrirVar(mesa: any) {
    const queryParams = { queryParams: { mode: 'viewer' } };
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/mesa', mesa.code], queryParams)
    );
    window.open(url, '_blank');
  }
}
