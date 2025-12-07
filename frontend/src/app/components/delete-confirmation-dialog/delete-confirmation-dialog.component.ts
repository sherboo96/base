import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';

@Component({
  selector: 'app-delete-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <!-- Horizontal Layout -->
      <div class="flex items-start gap-4">
        <!-- Icon Section -->
        <div class="flex-shrink-0">
          <div
            class="flex items-center justify-center h-12 w-12 rounded-full bg-red-50"
          >
            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
          </div>
        </div>

        <!-- Content Section -->
        <div class="flex-1 min-w-0">
          <!-- Title and Message -->
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-1">
              {{ dialogRef.data.title }}
            </h3>
            <p class="text-sm text-gray-600 mb-2">{{ dialogRef.data.message }}</p>
            <div class="bg-red-50 border border-red-200 rounded-md p-3">
              <p class="text-xs text-red-700 flex items-start">
                <i class="fas fa-info-circle text-red-500 mr-2 mt-0.5"></i>
                <span>This action cannot be undone. All associated data will be permanently removed.</span>
              </p>
            </div>
          </div>

          <!-- Actions - Horizontal -->
          <div class="flex justify-end gap-3 pt-2">
            <button
              (click)="dialogRef.close(false)"
              class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-200"
            >
              {{ dialogRef.data.cancelText }}
            </button>
            <button
              (click)="dialogRef.close(true)"
              class="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors duration-200"
            >
              <i class="fas fa-trash-alt mr-2"></i>
              {{ dialogRef.data.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class DeleteConfirmationDialogComponent {
  constructor(
    public dialogRef: DialogRef<{
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
    }>
  ) {}
}
