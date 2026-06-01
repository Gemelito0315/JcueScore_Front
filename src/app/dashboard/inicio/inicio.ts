import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio implements OnInit {
  private http = inject(HttpClient);

  totalUsuarios    = signal(0);
  totalProductos   = signal(0);
  totalMesas       = signal(0);
  totalClientes    = signal(0);
  mesasOcupadas    = signal(0);
  deudasPendientes = signal(0);
  reservasHoy      = signal(0);
  maintenance      = signal(false);
  turnoActivo      = signal<any>(null);
  stockBajo        = signal(0);
  totalPartidas    = signal(0);
  loading          = signal(true);

  readonly hoy = new Date().toISOString().split('T')[0];

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);

    this.http.get<any[]>(`${API}/users`).subscribe({
      next: d => this.totalUsuarios.set(d.length), error: () => {}
    });

    this.http.get<any[]>(`${API}/productos`).subscribe({
      next: d => {
        this.totalProductos.set(d.length);
        this.stockBajo.set(d.filter((p: any) => p.isActive && p.stock <= p.minStock).length);
      },
      error: () => {}
    });

    this.http.get<any[]>(`${API}/recursos`).subscribe({
      next: d => {
        this.totalMesas.set(d.length);
        this.mesasOcupadas.set(d.filter((r: any) => r.status === 'occupied').length);
      },
      error: () => {}
    });

    this.http.get<any[]>(`${API}/clientes`).subscribe({
      next: d => this.totalClientes.set(d.length), error: () => {}
    });

    this.http.get<any[]>(`${API}/deudas`).subscribe({
      next: d => this.deudasPendientes.set(
        d.filter((deu: any) => deu.estado === 'pendiente' || deu.estado === 'parcial').length
      ),
      error: () => {}
    });

    this.http.get<any[]>(`${API}/reservas`).subscribe({
      next: d => {
        const hoy = this.hoy;
        this.reservasHoy.set(
          d.filter((r: any) => r.fecha?.startsWith(hoy) && r.estado !== 'cancelada').length
        );
      },
      error: () => {}
    });

    this.http.get<any[]>(`${API}/partidas`).subscribe({
      next: d => this.totalPartidas.set(d.filter((p: any) => p.estado === 'en_juego').length),
      error: () => {}
    });

    this.http.get<any>(`${API}/operaciones/turno/activo`).subscribe({
      next: d => { this.turnoActivo.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });

    this.http.get<any>(`${API}/maintenance`).subscribe({
      next: d => this.maintenance.set(d?.active ?? false), error: () => {}
    });
  }

  formatCurrency(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  }

  turnoTiempo(): string {
    const t = this.turnoActivo();
    if (!t?.horaInicio) return '--:--';
    const diff = Date.now() - new Date(t.horaInicio).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }
}
