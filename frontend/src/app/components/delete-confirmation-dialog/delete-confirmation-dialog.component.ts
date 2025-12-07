import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';

@Component({
  selector: 'app-delete-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8 max-w-md mx-auto">
      <!-- Header -->
      <div class="text-center mb-6">
        <div
          class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-4"
        >
          <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">
          {{ dialogRef.data.title }}
        </h3>
        <p class="text-sm text-gray-500">{{ dialogRef.data.message }}</p>
      </div>

      <!-- Warning Message -->
      <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="fas fa-info-circle text-red-400"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">
              This action cannot be undone. All associated data will be
              permanently removed.
            </p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end space-x-3">
        <button
          (click)="dialogRef.close(false)"
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-200"
        >
          {{ dialogRef.data.cancelText }}
        </button>
        <button
          (click)="dialogRef.close(true)"
          class="px-4 py-2 border border-transparent rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors duration-200"
        >
          <i class="fas fa-trash-alt mr-2"></i>
          {{ dialogRef.data.confirmText }}
        </button>
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
