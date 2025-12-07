// pagination.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-pagination',
  template: `
    <div
      class="flex items-center justify-between bg-gray-50 p-4 border-t border-gray-200"
    >
      <p class="text-sm text-gray-500">
        Page {{ currentPage }} of {{ totalPages }}
      </p>
      <div class="flex gap-2">
        <button
          class="rounded-lg bg-gray-200 py-2 px-4 text-sm text-gray-600 hover:bg-gray-300 transition disabled:opacity-50"
          [disabled]="currentPage === 1"
          (click)="prev.emit()"
        >
          Previous
        </button>
        <button
          class="rounded-lg bg-gray-200 py-2 px-4 text-sm text-gray-600 hover:bg-gray-300 transition disabled:opacity-50"
          [disabled]="currentPage === totalPages"
          (click)="next.emit()"
        >
          Next
        </button>
      </div>
    </div>
  `,
})
export class PaginationComponent {
  @Input() currentPage: number = 1;
  @Input() totalPages: number = 1;
  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
}
