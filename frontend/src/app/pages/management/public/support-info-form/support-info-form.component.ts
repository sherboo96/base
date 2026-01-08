import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { PublicService, SupportInfo, SupportContact } from '../../../../services/public.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-support-info-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="flex flex-col h-full max-h-[90vh] bg-white">
      <!-- Fixed Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <h3 class="text-xl font-bold text-gray-900 mb-1 font-poppins flex items-center gap-2">
          <i class="fas fa-headset text-accent"></i>
          <span>{{ 'public.editSupportInfo' | translate }}</span>
        </h3>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-6 pt-4 pb-2 min-h-0">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex items-center justify-center py-16">
          <i class="fas fa-spinner fa-spin text-accent text-2xl"></i>
        </div>

        <!-- Form Content -->
        <form *ngIf="!isLoading && supportForm" [formGroup]="supportForm" (ngSubmit)="onSubmit()" class="space-y-4 pb-2">
          <!-- Contacts Section -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-2 font-poppins flex items-center gap-2">
              <i class="fas fa-users text-accent"></i>
              <span>{{ 'support.contacts' | translate }}</span>
            </label>
            <div formArrayName="contacts" class="space-y-3">
              <div *ngFor="let contactGroup of contactControls; let i = index" 
                   [formGroupName]="i"
                   class="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                <!-- Contact Header -->
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <i class="fas fa-user text-accent"></i>
                    <span>{{ 'support.contact' | translate }} {{ i + 1 }}</span>
                  </h4>
                  <button
                    type="button"
                    (click)="removeContact(i)"
                    class="px-2 py-1 border-2 border-red-500 rounded-lg text-red-600 bg-white hover:bg-red-50 transition-all duration-200 text-xs flex-shrink-0"
                    [disabled]="contactControls.length === 1"
                    [class.opacity-50]="contactControls.length === 1"
                    [class.cursor-not-allowed]="contactControls.length === 1"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                
                <!-- Name Field -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1 font-poppins">
                    {{ 'support.name' | translate }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    formControlName="name"
                    type="text"
                    class="w-full border-2 border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 bg-white"
                    [placeholder]="'support.namePlaceholder' | translate"
                    [class.border-red-500]="contactGroup.get('name')?.invalid && contactGroup.get('name')?.touched"
                  />
                  <p *ngIf="contactGroup.get('name')?.invalid && contactGroup.get('name')?.touched" class="text-xs text-red-500 mt-1">
                    {{ 'support.nameRequired' | translate }}
                  </p>
                </div>

                <!-- Email Field -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1 font-poppins">
                    {{ 'support.email' | translate }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    formControlName="email"
                    type="email"
                    class="w-full border-2 border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 bg-white"
                    [placeholder]="'support.emailPlaceholder' | translate"
                    [class.border-red-500]="contactGroup.get('email')?.invalid && contactGroup.get('email')?.touched"
                  />
                  <p *ngIf="contactGroup.get('email')?.invalid && contactGroup.get('email')?.touched" class="text-xs text-red-500 mt-1">
                    {{ 'support.invalidEmail' | translate }}
                  </p>
                </div>

                <!-- Phone Field -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1 font-poppins">
                    {{ 'support.phoneNumber' | translate }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    formControlName="phoneNumber"
                    type="tel"
                    class="w-full border-2 border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 bg-white"
                    [placeholder]="'support.phonePlaceholder' | translate"
                    [class.border-red-500]="contactGroup.get('phoneNumber')?.invalid && contactGroup.get('phoneNumber')?.touched"
                  />
                  <p *ngIf="contactGroup.get('phoneNumber')?.invalid && contactGroup.get('phoneNumber')?.touched" class="text-xs text-red-500 mt-1">
                    {{ 'support.phoneRequired' | translate }}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              (click)="addContact()"
              class="mt-2 mb-0 px-3 py-1.5 border-2 border-accent rounded-lg text-accent bg-white hover:bg-accent hover:text-white transition-all duration-200 text-xs font-medium"
            >
              <i class="fas fa-plus mr-1"></i>
              {{ 'support.addContact' | translate }}
            </button>
          </div>
        </form>
      </div>

      <!-- Fixed Footer -->
      <div *ngIf="!isLoading && supportForm" class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 flex-shrink-0">
        <button
          type="button"
          (click)="dialogRef.close(false)"
          class="px-4 py-2 border-2 border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
        >
          {{ 'common.cancel' | translate }}
        </button>
        <button
          type="button"
          (click)="onSubmit()"
          [disabled]="supportForm.invalid"
          class="px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accentDark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ 'common.save' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class SupportInfoFormComponent implements OnInit {
  supportForm!: FormGroup;
  isLoading = true;

  get contactControls() {
    return this.supportForm?.get('contacts') ? (this.supportForm.get('contacts') as FormArray).controls : [];
  }

  constructor(
    public dialogRef: DialogRef,
    private fb: FormBuilder,
    private publicService: PublicService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialize form immediately with empty contact
    this.supportForm = this.fb.group({
      contacts: this.fb.array([this.createContactFormGroup()]),
    });
    this.loadSupportInfo();
  }

  createContactFormGroup(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
    });
  }

  loadSupportInfo(): void {
    this.isLoading = true;
    this.cdr.detectChanges(); // Force change detection to show loading
    
    this.publicService.getSupportInfo().subscribe({
      next: (response: any) => {
        console.log('Support info response:', response);
        
        // Handle response structure
        const result = response?.result || response;
        let contacts: SupportContact[] = [];
        
        if (result?.contacts && Array.isArray(result.contacts) && result.contacts.length > 0) {
          // New format: use contacts array
          contacts = result.contacts;
        } else if (result?.emails || result?.phoneNumbers) {
          // Legacy format: convert emails/phoneNumbers to contacts
          const emails = Array.isArray(result.emails) ? result.emails : [];
          const phones = Array.isArray(result.phoneNumbers) ? result.phoneNumbers : [];
          const maxCount = Math.max(emails.length, phones.length);
          
          for (let i = 0; i < maxCount; i++) {
            contacts.push({
              name: `Contact ${i + 1}`,
              email: emails[i] || '',
              phoneNumber: phones[i] || ''
            });
          }
        }
        
        // Clear existing form arrays
        const contactsArray = this.supportForm.get('contacts') as FormArray;
        while (contactsArray.length > 0) {
          contactsArray.removeAt(0);
        }
        
        // Add contact controls
        if (contacts.length > 0) {
          contacts.forEach(contact => {
            contactsArray.push(this.fb.group({
              name: [contact.name || '', [Validators.required]],
              email: [contact.email || '', [Validators.required, Validators.email]],
              phoneNumber: [contact.phoneNumber || '', [Validators.required]],
            }));
          });
        } else {
          // Add one empty contact if none exist
          contactsArray.push(this.createContactFormGroup());
        }
        
        // Update loading state and trigger change detection
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading support info:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  addContact(): void {
    const contactsArray = this.supportForm.get('contacts') as FormArray;
    contactsArray.push(this.createContactFormGroup());
  }

  removeContact(index: number): void {
    const contactsArray = this.supportForm.get('contacts') as FormArray;
    if (contactsArray.length > 1) {
      contactsArray.removeAt(index);
    }
  }

  onSubmit(): void {
    if (this.supportForm.invalid) {
      this.supportForm.markAllAsTouched();
      return;
    }

    const formValue = this.supportForm.value;
    const supportInfo: SupportInfo = {
      contacts: formValue.contacts
        .filter((contact: any) => contact.name && contact.email && contact.phoneNumber)
        .map((contact: any) => ({
          name: contact.name.trim(),
          email: contact.email.trim(),
          phoneNumber: contact.phoneNumber.trim()
        }))
    };

    this.loadingService.show();
    this.publicService.updateSupportInfo(supportInfo).subscribe({
      next: () => {
        this.toastr.success(this.translationService.instant('public.supportInfoUpdateSuccess'));
        this.loadingService.hide();
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.toastr.error(error.error?.message || this.translationService.instant('public.supportInfoUpdateError'));
        this.loadingService.hide();
      },
    });
  }
}
