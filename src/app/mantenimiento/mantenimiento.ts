import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-mantenimiento',
  imports: [RouterLink],
  templateUrl: './mantenimiento.html',
  styleUrl: './mantenimiento.scss'
})
export class Mantenimiento implements OnInit {
  private http = inject(HttpClient);
  message = signal('Estamos realizando mejoras en el sistema.');
  estimatedTime = signal('');

  ngOnInit() {
    this.http.get<any>(`${environment.apiBaseUrl}/maintenance`).subscribe(data => {
      this.message.set(data.message);
      this.estimatedTime.set(data.estimatedTime);
    });
  }
}
