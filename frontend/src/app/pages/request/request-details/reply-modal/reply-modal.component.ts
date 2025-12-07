import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reply-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <!-- Header -->
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-2xl font-bold text-gray-800">Reply to Request</h2>
        </div>

        <!-- Content -->
        <div class="p-6">
          <!-- Activities Section -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Activities</h3>
            <div class="space-y-4">
              <div
                *ngFor="let activity of activities"
                class="bg-gray-50 p-4 rounded-lg"
              >
                <div class="flex justify-between items-start mb-2">
                  <h4 class="font-medium text-gray-800">{{ activity.name }}</h4>
                  <span
                    class="px-3 py-1 rounded-full text-sm font-semibold"
                    [ngClass]="getStatusClass(activity.statusId)"
                  >
                    {{ activity.status.nameAr }}
                  </span>
                </div>
                <p class="text-gray-600 text-sm">{{ activity.description }}</p>
              </div>
            </div>
          </div>

          <!-- Notes Section -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Notes</h3>
            <textarea
              [(ngModel)]="notes"
              class="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9ae81] focus:border-transparent resize-none text-right rtl"
              placeholder="Enter your notes here..."
              dir="rtl"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-4">
            <button
              (click)="onClose()"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Close
            </button>
            <button
              (click)="onSubmit()"
              class="px-4 py-2 border border-transparent rounded-md text-white bg-[#c9ae81] hover:bg-[#b89a6d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c9ae81]"
            >
              Submit Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ReplyModalComponent {
  @Input() activities: any[] = [];
  @Input() notes: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() replyNotes = new EventEmitter<string>();

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 1:
        return 'bg-yellow-100 text-yellow-800';
      case 2:
        return 'bg-blue-100 text-blue-800';
      case 1002:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    this.replyNotes.emit(this.notes);
    this.submit.emit();
  }
}
