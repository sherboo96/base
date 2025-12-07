import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';

@Component({
  selector: 'app-delete-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="text-center">
        <div
          class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4"
        >
          <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Delete User Role</h3>
        <p class="text-sm text-gray-500">
          Are you sure you want to delete this user role? This action cannot be
          undone.
        </p>
      </div>
      <div class="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          (click)="dialogRef.close(false)"
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          (click)="dialogRef.close(true)"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  `,
})
export class DeleteConfirmationDialogComponent {
  constructor(public dialogRef: DialogRef) {}
}
