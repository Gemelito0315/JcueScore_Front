import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { PlayerCardComponent } from '../../usuario/player-card/player-card';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, PlayerCardComponent],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio implements OnInit {
  private http = inject(HttpClient);

  totalUsuarios = signal(0);
  totalProductos = signal(0);
  totalMesas = signal(0);
  maintenance = signal(false);

  ngOnInit() {
    this.http.get<any[]>(`${API}/users`).subscribe({ next: d => this.totalUsuarios.set(d.length), error: () => {} });
    this.http.get<any[]>(`${API}/productos`).subscribe({ next: d => this.totalProductos.set(d.length), error: () => {} });
    this.http.get<any[]>(`${API}/recursos`).subscribe({ next: d => this.totalMesas.set(d.length), error: () => {} });
    this.http.get<any>(`${API}/maintenance`).subscribe({ next: d => this.maintenance.set(d.active), error: () => {} });
  }
}
