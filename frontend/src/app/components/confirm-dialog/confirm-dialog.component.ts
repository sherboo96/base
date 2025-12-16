import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="bg-white rounded-lg shadow-xl max-w-md mx-auto font-poppins overflow-hidden">
      <!-- Header with red text and warning icon -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <i class="fas fa-exclamation-triangle text-red-600"></i>
          <h3 class="text-lg font-semibold text-red-600 font-poppins">
            {{ dialogRef.data.title || ('common.confirm' | translate) }}
          </h3>
        </div>
      </div>

      <!-- Content Section -->
      <div class="px-6 py-6">
        <!-- Main Message -->
        <p class="text-base text-gray-900 mb-2 font-poppins">
          {{ dialogRef.data.message }}
        </p>
        
        <!-- Warning Message (if provided) -->
        <p *ngIf="dialogRef.data.warningMessage" class="text-sm text-gray-600 text-center font-poppins">
          {{ dialogRef.data.warningMessage }}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
        <!-- Confirm Button (Left - Light Blue) -->
        <button
          (click)="dialogRef.close(true)"
          class="px-4 py-2 border-2 border-blue-400 rounded-lg text-sm font-medium text-blue-500 bg-white hover:bg-blue-50 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-all duration-200 font-poppins flex items-center gap-2"
        >
          <i class="fas fa-check text-blue-500"></i>
          <span>{{ dialogRef.data.confirmText || ('common.confirm' | translate) }}</span>
        </button>
        
        <!-- Cancel Button (Right - Red) -->
        <button
          (click)="dialogRef.close(false)"
          class="px-4 py-2 border-2 border-red-500 rounded-lg text-sm font-medium text-red-600 bg-white hover:bg-red-50 hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-all duration-200 font-poppins flex items-center gap-2"
        >
          <i class="fas fa-times text-red-600"></i>
          <span>{{ dialogRef.data.cancelText || ('common.cancel' | translate) }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: DialogRef<{
      title?: string;
      message: string;
      warningMessage?: string;
      confirmText?: string;
      cancelText?: string;
    }>
  ) {}
}

