import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private snackBar = inject(MatSnackBar);

  showSuccess(message: string, duration: number = 3000) {
    this.snackBar.open(message, 'Cerrar', {
      duration,
      panelClass: ['success-snackbar']
    });
  }

  showError(message: string, duration: number = 3000) {
    this.snackBar.open(message, 'Cerrar', {
      duration,
      panelClass: ['error-snackbar']
    });
  }

  showWarning(message: string, duration: number = 3000) {
    this.snackBar.open(message, 'Cerrar', {
      duration,
      panelClass: ['warning-snackbar']
    });
  }

  showInfo(message: string, duration: number = 3000) {
    this.snackBar.open(message, 'Cerrar', {
      duration,
      panelClass: ['info-snackbar']
    });
  }
}
