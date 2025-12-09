import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';

@Component({
  selector: 'app-delete-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8 max-w-lg mx-auto font-poppins">
      <!-- Enhanced Layout with better spacing -->
      <div class="flex flex-col items-center text-center">
        <!-- Icon Section with Animation -->
        <div class="mb-6">
          <div
            [ngClass]="{
              'bg-red-50': dialogRef.data.type === 'danger' || !dialogRef.data.type,
              'bg-accent/10': dialogRef.data.type === 'info' || dialogRef.data.type === 'main',
              'bg-yellow-50': dialogRef.data.type === 'warning',
              'bg-green-50': dialogRef.data.type === 'success'
            }"
            class="flex items-center justify-center h-20 w-20 rounded-full mx-auto shadow-lg animate-pulse"
          >
            <i
              [ngClass]="{
                'fa-exclamation-triangle text-red-600': dialogRef.data.type === 'danger' || !dialogRef.data.type,
                'fa-info-circle text-accent': dialogRef.data.type === 'info' || dialogRef.data.type === 'main',
                'fa-exclamation-circle text-yellow-600': dialogRef.data.type === 'warning',
                'fa-check-circle text-green-600': dialogRef.data.type === 'success',
                'fa-flag text-accent': dialogRef.data.type === 'main'
              }"
              class="fas text-3xl"
            ></i>
          </div>
        </div>

        <!-- Content Section -->
        <div class="w-full">
          <!-- Title -->
          <h3 class="text-2xl font-bold text-gray-900 mb-3 font-poppins">
            {{ dialogRef.data.title }}
          </h3>
          
          <!-- Message -->
          <p class="text-base text-gray-600 mb-6 leading-relaxed font-poppins">
            {{ dialogRef.data.message }}
          </p>

          <!-- Warning/Info Box (conditional) -->
          <div
            *ngIf="dialogRef.data.showWarning !== false"
            [ngClass]="{
              'bg-red-50 border-red-200': dialogRef.data.type === 'danger' || !dialogRef.data.type,
              'bg-accent/10 border-accent/30': dialogRef.data.type === 'info' || dialogRef.data.type === 'main',
              'bg-yellow-50 border-yellow-200': dialogRef.data.type === 'warning',
              'bg-green-50 border-green-200': dialogRef.data.type === 'success'
            }"
            class="border rounded-lg p-4 mb-6"
          >
            <p
              [ngClass]="{
                'text-red-700': dialogRef.data.type === 'danger' || !dialogRef.data.type,
                'text-accent-dark': dialogRef.data.type === 'info' || dialogRef.data.type === 'main',
                'text-yellow-700': dialogRef.data.type === 'warning',
                'text-green-700': dialogRef.data.type === 'success'
              }"
              class="text-sm flex items-start justify-center font-poppins"
            >
              <i
                [ngClass]="{
                  'fa-info-circle text-red-500': dialogRef.data.type === 'danger' || !dialogRef.data.type,
                  'fa-info-circle text-accent': dialogRef.data.type === 'info' || dialogRef.data.type === 'main',
                  'fa-exclamation-circle text-yellow-500': dialogRef.data.type === 'warning',
                  'fa-check-circle text-green-500': dialogRef.data.type === 'success'
                }"
                class="fas mr-2 mt-0.5"
              ></i>
              <span>{{ dialogRef.data.warningMessage || 'This action cannot be undone.' }}</span>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-center gap-4 pt-4">
            <button
              (click)="dialogRef.close(false)"
              class="px-6 py-3 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md font-poppins"
            >
              {{ dialogRef.data.cancelText || 'Cancel' }}
            </button>
            <button
              (click)="dialogRef.close(true)"
              [ngClass]="{
                'bg-red-600 hover:bg-red-700 focus:ring-red-500': dialogRef.data.type === 'danger' || !dialogRef.data.type,
                'bg-accent hover:bg-accent-dark focus:ring-accent': dialogRef.data.type === 'info' || dialogRef.data.type === 'main',
                'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500': dialogRef.data.type === 'warning',
                'bg-green-600 hover:bg-green-700 focus:ring-green-500': dialogRef.data.type === 'success'
              }"
              class="px-6 py-3 border-2 border-transparent rounded-lg text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md font-poppins"
            >
              <i
                [ngClass]="{
                  'fa-trash-alt': dialogRef.data.type === 'danger' || !dialogRef.data.type,
                  'fa-check': dialogRef.data.type === 'info' || dialogRef.data.type === 'main' || dialogRef.data.type === 'success',
                  'fa-exclamation': dialogRef.data.type === 'warning',
                  'fa-flag': dialogRef.data.type === 'main'
                }"
                class="fas mr-2"
              ></i>
              {{ dialogRef.data.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class DeleteConfirmationDialogComponent {
  constructor(
    public dialogRef: DialogRef<{
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      type?: 'danger' | 'info' | 'warning' | 'success' | 'main';
      warningMessage?: string;
      showWarning?: boolean;
    }>
  ) {}
}
