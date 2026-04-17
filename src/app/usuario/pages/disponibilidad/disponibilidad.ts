import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-usuario-disponibilidad',
  imports: [CommonModule],
  templateUrl: './disponibilidad.html',
  styleUrl: './disponibilidad.scss'
})
export class UsuarioDisponibilidad {
  filtro = signal('todos');

  recursos = signal([
    { id: 1, nombre: 'Mesa 1', tipo: 'Billar', estado: 'libre', precio: 15000 },
    { id: 2, nombre: 'Mesa 2', tipo: 'Billar', estado: 'ocupada', precio: 15000 },
    { id: 3, nombre: 'Mesa 3', tipo: 'Billar', estado: 'libre', precio: 15000 },
    { id: 4, nombre: 'Mesa 4', tipo: 'Billar', estado: 'mantenimiento', precio: 15000 },
    { id: 5, nombre: 'Chancha 1', tipo: 'Tejo', estado: 'libre', precio: 12000 },
    { id: 6, nombre: 'Chancha 2', tipo: 'Tejo', estado: 'ocupada', precio: 12000 },
    { id: 7, nombre: 'Máquina 1', tipo: 'Bolirama', estado: 'libre', precio: 10000 },
    { id: 8, nombre: 'Máquina 2', tipo: 'Bolirama', estado: 'libre', precio: 10000 },
  ]);

  get filtrados() {
    const f = this.filtro();
    if (f === 'todos') return this.recursos();
    return this.recursos().filter(r => r.tipo.toLowerCase() === f);
  }

  getIcon(tipo: string) {
    return { Billar: '🎱', Tejo: '🎯', Bolirama: '🎳' }[tipo] ?? '🎮';
  }

  getEstadoClass(estado: string) {
    return { libre: 'libre', ocupada: 'ocupada', mantenimiento: 'mant' }[estado] ?? '';
  }
}
