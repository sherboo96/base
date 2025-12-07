import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Option {
  id: number;
  name: string;
  [key: string]: any;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative searchable-select">
      <div class="relative">
        <input
          type="text"
          [(ngModel)]="searchTerm"
          (ngModelChange)="onSearch()"
          (focus)="isOpen = true"
          [placeholder]="placeholder"
          class="form-control w-full border border-gray-300 rounded-lg py-1.5 pl-3 pr-8 text-sm focus:ring focus:ring-opacity-50"
          [disabled]="disabled"
        />
        <div
          class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"
        >
          <i class="fas fa-chevron-down text-gray-400 text-sm"></i>
        </div>
      </div>

      <!-- Dropdown -->
      <div
        *ngIf="isOpen"
        class="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto"
      >
        <div class="py-1">
          <div
            *ngFor="let option of filteredOptions"
            (click)="selectOption(option)"
            class="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center"
          >
            <div class="flex-1">{{ option.name }}</div>
            <div *ngIf="option['email']" class="text-gray-500 text-xs">
              ({{ option['email'] }})
            </div>
            <div
              *ngIf="option['system']?.['name']"
              class="text-gray-500 text-xs"
            >
              ({{ option['system']['name'] }})
            </div>
          </div>
          <div
            *ngIf="filteredOptions.length === 0"
            class="px-3 py-2 text-sm text-gray-500 text-center"
          >
            No options found
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SearchableSelectComponent {
  @Input() options: Option[] = [];
  @Input() placeholder: string = 'Select an option';
  @Input() disabled: boolean = false;
  @Input() value: number | null = null;
  @Output() valueChange = new EventEmitter<number | null>();

  searchTerm: string = '';
  isOpen: boolean = false;
  filteredOptions: Option[] = [];

  ngOnInit() {
    this.filteredOptions = this.options;
    if (this.value) {
      const selectedOption = this.options.find((opt) => opt.id === this.value);
      if (selectedOption) {
        this.searchTerm = selectedOption.name;
      }
    }
  }

  onSearch() {
    if (!this.searchTerm) {
      this.filteredOptions = this.options;
    } else {
      this.filteredOptions = this.options.filter(
        (option) =>
          option.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (option['email'] &&
            option['email']
              .toLowerCase()
              .includes(this.searchTerm.toLowerCase())) ||
          (option['system']?.['name'] &&
            option['system']['name']
              .toLowerCase()
              .includes(this.searchTerm.toLowerCase()))
      );
    }
  }

  selectOption(option: Option) {
    this.value = option.id;
    this.searchTerm = option.name;
    this.valueChange.emit(option.id);
    this.isOpen = false;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.searchable-select')) {
      this.isOpen = false;
    }
  }
}
