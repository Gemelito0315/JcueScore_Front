import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./log-in/log-in').then(m => m.LogIn)
      },
      {
        path: 'sign-in',
        loadComponent: () => import('./sign-in/sign-in').then(m => m.SignIn)
      },
      {
        path: 'verify',
        loadComponent: () => import('./verify/verify').then(m => m.VerifyComponent)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  }
];