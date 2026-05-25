import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button mat-flat-button [color]="data.danger ? 'warn' : 'primary'" [mat-dialog-close]="true">
        {{ data.confirmText || 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 380px;
    }
    mat-dialog-content {
      margin: 16px 0;
    }
    p {
      color: #a0a0a0; /* لون رمادي مريح للعين */
      font-size: 1rem;
      margin: 0;
    }
    mat-dialog-actions {
      margin-bottom: -8px;
    }
    /* تنسيق زرار الإلغاء */
    .cancel-btn {
      color: #ffffff;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }
    /* تنسيق زرار الحذف */
    .confirm-btn {
      border-radius: 8px;
      min-width: 100px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
    public dialogRef: MatDialogRef<ConfirmDialogComponent>
  ) {}
}