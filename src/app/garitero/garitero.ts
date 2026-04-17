import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../auth/services/auth';

@Component({
  selector: 'app-garitero',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './garitero.html',
  styleUrl: './garitero.scss'
})
export class Garitero implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);

  currentUser = this.auth.currentUser;
  currentTime = signal('00:00:00');
  private clockInterval: any;

  ngOnInit() {
    const update = () => {
      const now = new Date();
      this.currentTime.set(
        `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
      );
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  }

  ngOnDestroy() { clearInterval(this.clockInterval); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
