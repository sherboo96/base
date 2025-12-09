// generic-modal.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-generic-modal',
  template: `
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 font-poppins"
      *ngIf="visible"
    >
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg animate-[fadeInDown_0.2s_ease-out]">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-800 font-poppins">{{ title }}</h2>
          <button
            (click)="close.emit()"
            class="text-gray-500 hover:text-accent transition-colors font-poppins"
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
