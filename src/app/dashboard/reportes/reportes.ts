import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-reportes',
  imports: [CommonModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes implements OnInit {
  private http = inject(HttpClient);

  periodoActivo = signal<'hoy' | 'semana' | 'mes'>('hoy');

  // Stats generales (mock listo para conectar al back)
  stats = signal({
    ingresoTotal: 485000,
    ingresoAnterior: 420000,
    totalPartidas: 34,
    partidasAnterior: 28,
    horasJugadas: 52,
    clientesUnicos: 21,
    mesaMasUsada: 'Mesa 1',
    horaPico: '7:00 PM - 9:00 PM',
    promedioPartida: 14250,
  });

  // Ingresos por día (últimos 7 días)
  ingresosDia = signal([
    { dia: 'Lun', valor: 65000 },
    { dia: 'Mar', valor: 48000 },
    { dia: 'Mié', valor: 72000 },
    { dia: 'Jue', valor: 55000 },
    { dia: 'Vie', valor: 98000 },
    { dia: 'Sáb', valor: 125000 },
    { dia: 'Dom', valor: 85000 },
  ]);

  // Uso por tipo de juego
  usoTipos = signal([
    { tipo: 'Billar', partidas: 18, porcentaje: 53, color: '#06b6d4' },
    { tipo: 'Tres Bandas', partidas: 10, porcentaje: 29, color: '#6366f1' },
    { tipo: 'Tejo', partidas: 4, porcentaje: 12, color: '#34d399' },
    { tipo: 'Bolirama', partidas: 2, porcentaje: 6, color: '#f59e0b' },
  ]);

  // Top mesas
  topMesas = signal([
    { code: 'Mesa 1', horas: 18, ingresos: 270000, partidas: 12 },
    { code: 'Mesa 3', horas: 14, ingresos: 280000, partidas: 10 },
    { code: 'Mesa 2', horas: 10, ingresos: 150000, partidas: 8 },
    { code: 'Chancha 1', horas: 6, ingresos: 72000, partidas: 4 },
  ]);

  // Top clientes
  topClientes = signal([
    { nombre: 'Carlos R.', visitas: 8, gasto: 114000, nivel: 'Oro' },
    { nombre: 'Andrés M.', visitas: 6, gasto: 85000, nivel: 'Plata' },
    { nombre: 'Luis P.', visitas: 5, gasto: 70000, nivel: 'Plata' },
    { nombre: 'Juan C.', visitas: 4, gasto: 56000, nivel: 'Bronce' },
    { nombre: 'Pedro V.', visitas: 3, gasto: 42000, nivel: 'Bronce' },
  ]);

  ngOnInit() {
    // Aquí se conectará al backend: GET /reportes?periodo=hoy
  }

  get maxIngreso() {
    return Math.max(...this.ingresosDia().map(d => d.valor));
  }

  get variacionIngreso() {
    const actual = this.stats().ingresoTotal;
    const anterior = this.stats().ingresoAnterior;
    return Math.round(((actual - anterior) / anterior) * 100);
  }

  get variacionPartidas() {
    const actual = this.stats().totalPartidas;
    const anterior = this.stats().partidasAnterior;
    return Math.round(((actual - anterior) / anterior) * 100);
  }

  getNivelColor(nivel: string) {
    return { Oro: '#fbbf24', Plata: '#94a3b8', Bronce: '#f59e0b' }[nivel] ?? '#64748b';
  }
}
