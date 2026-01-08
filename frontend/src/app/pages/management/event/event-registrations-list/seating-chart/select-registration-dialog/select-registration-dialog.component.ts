import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { EventRegistration } from '../../../../../../services/event-registration.service';

@Component({
  selector: 'app-select-registration-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6">
        <h3 class="text-xl font-bold text-gray-900 font-poppins mb-2">
          {{ 'eventRegistration.selectRegistration' | translate }}
        </h3>
        <p class="text-sm text-gray-600 font-poppins">
          {{ 'eventRegistration.selectRegistrationForSeat' | translate }}: <span class="font-semibold text-accent">{{ seatId }}</span>
        </p>
      </div>

      <!-- Registration Selection Section -->
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <label class="block text-sm font-semibold text-gray-800 font-poppins mb-3">
          <i class="fas fa-users mr-2 text-accent"></i>
          {{ 'eventRegistration.selectRegistration' | translate }}
        </label>
        <div class="registration-search-container relative">
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input
                type="text"
                [(ngModel)]="searchTerm"
                [ngModelOptions]="{standalone: true}"
                (ngModelChange)="onSearchInputChange()"
                (keydown.enter)="onSearchButtonClick()"
                (focus)="onSearchInputFocus()"
                [placeholder]="'eventRegistration.searchRegistration' | translate"
                class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white shadow-sm"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fas fa-user text-gray-400 text-sm"></i>
              </div>
            </div>
            <button
              type="button"
              (click)="onSearchButtonClick()"
              [disabled]="isSearching"
              class="px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-accentDark transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed font-poppins flex items-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
            >
              <i class="fas" [class.fa-search]="!isSearching" [class.fa-spinner]="isSearching" [class.fa-spin]="isSearching"></i>
              <span class="hidden sm:inline">{{ 'common.search' | translate }}</span>
            </button>
          </div>
          
          <!-- Registration Dropdown -->
          <div
            *ngIf="isDropdownOpen"
            class="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border-2 border-gray-200 max-h-96 overflow-auto"
          >
            <div class="py-1">
              <div *ngIf="isSearching" class="px-4 py-3 text-sm text-gray-500 text-center">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                {{ 'common.searching' | translate }}
              </div>
              <div
                *ngFor="let option of filteredOptions"
                (click)="selectRegistration(option.id)"
                class="px-4 py-2.5 text-sm text-gray-700 hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
              >
                <div class="flex items-center gap-2">
                  <i class="fas fa-user-circle text-gray-400 text-xs"></i>
                  <span class="flex-1 font-poppins">{{ option.name }}</span>
                </div>
              </div>
              <div
                *ngIf="!isSearching && filteredOptions.length === 0 && searchTerm && searchTerm.length >= 2"
                class="px-4 py-3 text-sm text-gray-500 text-center font-poppins"
              >
                <i class="fas fa-info-circle mr-2"></i>
                {{ 'eventRegistration.noRegistrationsFound' | translate }}
              </div>
              <div
                *ngIf="!isSearching && filteredOptions.length === 0 && (!searchTerm || searchTerm.length < 1)"
                class="px-4 py-3 text-sm text-gray-500 text-center font-poppins"
              >
                <i class="fas fa-keyboard mr-2"></i>
                {{ 'eventRegistration.typeToSearchRegistrations' | translate }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button
          (click)="dialogRef.close(null)"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm font-poppins"
        >
          {{ 'common.cancel' | translate }}
        </button>
        <button
          *ngIf="selectedRegistrationId"
          (click)="assignRegistration()"
          class="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accentDark transition-colors font-medium text-sm font-poppins"
        >
          {{ 'eventRegistration.assignRegistration' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class SelectRegistrationDialogComponent implements OnInit {
  seatId: string;
  registrations: EventRegistration[] = [];
  registrationOptions: Array<{ id: number; name: string; searchText: string }> = [];
  selectedRegistrationId: number | null = null;
  
  // Search properties
  searchTerm: string = '';
  isDropdownOpen = false;
  isSearching = false;
  filteredOptions: Array<{ id: number; name: string; searchText: string }> = [];

  constructor(
    public dialogRef: DialogRef<{ 
      seatId: string; 
      registrations: EventRegistration[];
      onAssign: (registrationId: number) => void;
    }>,
    private cdr: ChangeDetectorRef
  ) {
    this.seatId = this.dialogRef.data.seatId;
    this.registrations = this.dialogRef.data.registrations || [];
  }

  ngOnInit(): void {
    this.updateRegistrationOptions();
    // Show all options initially
    this.filteredOptions = this.registrationOptions;
  }

  updateRegistrationOptions(): void {
    this.registrationOptions = this.registrations.map(reg => ({
      id: reg.id!,
      name: `${reg.name}${reg.nameAr ? ' (' + reg.nameAr + ')' : ''}${reg.jobTitle ? ' - ' + reg.jobTitle : ''}`,
      searchText: `${reg.name} ${reg.nameAr || ''} ${reg.jobTitle || ''} ${reg.email || ''}`.toLowerCase().trim()
    }));
  }

  onSearchInputFocus(): void {
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.isDropdownOpen = true;
      this.performSearch();
      this.cdr.detectChanges();
    }, 0);
  }

  onSearchInputChange(): void {
    // Real-time search as user types
    this.performSearch();
  }

  onSearchButtonClick(): void {
    this.performSearch();
  }

  performSearch(): void {
    const searchTerm = this.searchTerm?.trim() || '';
    
    if (!searchTerm || searchTerm.length < 1) {
      // Show all options if search term is empty
      this.filteredOptions = this.registrationOptions;
      this.isDropdownOpen = true;
      this.isSearching = false;
      this.cdr.detectChanges();
      return;
    }
    
    this.isDropdownOpen = true;
    this.isSearching = true;
    this.cdr.detectChanges();
    
    // Perform search immediately
    setTimeout(() => {
      const searchLower = searchTerm.toLowerCase().trim();
      this.filteredOptions = this.registrationOptions.filter(option =>
        option.searchText.includes(searchLower) || option.name.toLowerCase().includes(searchLower)
      );
      this.isSearching = false;
      this.cdr.detectChanges();
    }, 50);
  }

  selectRegistration(registrationId: number): void {
    this.selectedRegistrationId = registrationId;
    const selectedOption = this.registrationOptions.find(opt => opt.id === registrationId);
    if (selectedOption) {
      this.searchTerm = selectedOption.name;
    }
    this.isDropdownOpen = false;
    this.cdr.detectChanges();
  }

  assignRegistration(): void {
    if (this.selectedRegistrationId) {
      this.dialogRef.data.onAssign(this.selectedRegistrationId);
      this.dialogRef.close(this.selectedRegistrationId);
    }
  }
}

