// generic-modal.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-generic-modal',
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      *ngIf="visible"
    >
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-800">{{ title }}</h2>
          <button
            (click)="close.emit()"
            class="text-gray-500 hover:text-gray-700 transition"
          >
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class GenericModalComponent {
  @Input() title: string = '';
  @Input() visible: boolean = false;
  @Output() close = new EventEmitter<void>();
}
