import { Routes } from '@angular/router';

export const TABLET_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () => import('../mesa/mesa').then(m => m.Mesa)
  }
];
