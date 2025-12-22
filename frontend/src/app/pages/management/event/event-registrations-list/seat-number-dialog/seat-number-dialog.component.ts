import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { EventRegistrationService } from '../../../../../services/event-registration.service';
import { LoadingService } from '../../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../../services/translation.service';

@Component({
  selector: 'app-seat-number-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center space-x-3 mb-2">
          <div class="p-2 bg-accent/10 rounded-lg">
            <i class="fas fa-chair text-accent text-xl"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-textDark font-poppins">
              {{ currentSeatNumber ? ('eventRegistration.editSeatNumber' | translate) : ('eventRegistration.addSeatNumber' | translate) }}
            </h3>
            <p class="text-sm text-gray-600 mt-1 font-poppins">
              {{ 'eventRegistration.enterSeatNumberDescription' | translate }}
            </p>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="space-y-2">
          <label for="seatNumber" class="block text-sm font-medium text-gray-700 font-poppins">
            {{ 'eventRegistration.seatNumber' | translate }}
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-chair text-gray-400"></i>
            </div>
            <input
              id="seatNumber"
              type="text"
              formControlName="seatNumber"
              (input)="duplicateError = null; duplicateAttendee = null"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins"
              [class.border-red-500]="(form.get('seatNumber')?.invalid && form.get('seatNumber')?.touched) || duplicateError"
              [placeholder]="'eventRegistration.seatNumberPlaceholder' | translate"
              autofocus
            />
          </div>
          <div *ngIf="form.get('seatNumber')?.invalid && form.get('seatNumber')?.touched" class="flex items-center text-sm text-red-600">
            <i class="fas fa-exclamation-circle mr-1"></i>
            <span>{{ 'eventRegistration.seatNumberRequired' | translate }}</span>
          </div>
          <!-- Duplicate Error -->
          <div *ngIf="duplicateError" class="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-start gap-2">
              <i class="fas fa-exclamation-triangle text-red-600 mt-0.5"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-red-800 font-poppins">{{ duplicateError }}</p>
                <div *ngIf="duplicateAttendee" class="mt-2 p-2 bg-white rounded border border-red-100">
                  <p class="text-xs font-semibold text-gray-700 font-poppins mb-1">{{ 'eventRegistration.currentlyAssignedTo' | translate }}:</p>
                  <p class="text-xs text-gray-900 font-poppins">{{ duplicateAttendee.name }} <span *ngIf="duplicateAttendee.nameAr" class="text-gray-600" dir="rtl">({{ duplicateAttendee.nameAr }})</span></p>
                  <p class="text-xs text-gray-600 font-poppins mt-1">
                    <i class="fas fa-envelope mr-1"></i>{{ duplicateAttendee.email }}
                  </p>
                  <p *ngIf="duplicateAttendee.organization" class="text-xs text-gray-600 font-poppins mt-1">
                    <i class="fas fa-building mr-1"></i>{{ duplicateAttendee.organization }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            (click)="onCancel()"
            class="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium font-poppins"
          >
            {{ 'common.cancel' | translate }}
          </button>
          <button
            type="submit"
            [disabled]="form.invalid || isSubmitting"
            class="px-6 py-2.5 bg-accentDark text-white rounded-lg hover:bg-accentDarker transition-all duration-200 shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed font-poppins"
          >
            <span *ngIf="!isSubmitting">{{ 'common.save' | translate }}</span>
            <span *ngIf="isSubmitting">{{ 'common.saving' | translate }}</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class SeatNumberDialogComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  currentSeatNumber: string | null = null;
  duplicateError: string | null = null;
  duplicateAttendee: { name: string; nameAr?: string; email: string; organization?: string } | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: DialogRef<{ currentSeatNumber?: string; registrationId?: number }>,
    private eventRegistrationService: EventRegistrationService,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize form with empty value - we'll fetch from API in ngOnInit
    this.form = this.fb.group({
      seatNumber: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
    const registrationId = this.dialogRef.data?.registrationId;

    if (registrationId) {
      // Fetch fresh data from API to get the current seat number
      this.eventRegistrationService.getById(registrationId).subscribe({
        next: (response) => {
          if (response.result) {
            const seatNumberValue = response.result.seatNumber;
            const valueToSet = (seatNumberValue && typeof seatNumberValue === 'string' && seatNumberValue.trim() !== '')
              ? seatNumberValue.trim()
              : '';

            // Update currentSeatNumber for title display
            this.currentSeatNumber = valueToSet || null;

            // Set the form value directly from API response
            this.form.get('seatNumber')?.setValue(valueToSet, { emitEvent: false });

            // Also set the input value directly
            setTimeout(() => {
              const input = document.getElementById('seatNumber') as HTMLInputElement;
              if (input) {
                input.value = valueToSet;
                input.focus();
                if (valueToSet) {
                  input.select();
                }
              }
            }, 50);
          }
        },
        error: () => {
          // If API fails, use the passed value
          const seatNumberValue = this.dialogRef.data?.currentSeatNumber;
          const valueToSet = (seatNumberValue && typeof seatNumberValue === 'string' && seatNumberValue.trim() !== '')
            ? seatNumberValue.trim()
            : '';
          this.currentSeatNumber = valueToSet || null;
          this.form.get('seatNumber')?.setValue(valueToSet, { emitEvent: false });
        }
      });
    } else {
      // No registration ID, use passed value
      const seatNumberValue = this.dialogRef.data?.currentSeatNumber;
      const valueToSet = (seatNumberValue && typeof seatNumberValue === 'string' && seatNumberValue.trim() !== '')
        ? seatNumberValue.trim()
        : '';
      this.currentSeatNumber = valueToSet || null;
      this.form.get('seatNumber')?.setValue(valueToSet, { emitEvent: false });

      setTimeout(() => {
        const input = document.getElementById('seatNumber') as HTMLInputElement;
        if (input) {
          input.value = valueToSet;
          input.focus();
          if (valueToSet) {
            input.select();
          }
        }
      }, 50);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const registrationId = this.dialogRef.data?.registrationId;
    if (!registrationId) {
      this.toastr.error(this.translationService.instant('eventRegistration.seatNumberUpdateError'));
      return;
    }

    // Clear previous errors
    this.duplicateError = null;
    this.duplicateAttendee = null;

    this.isSubmitting = true;
    const trimmedSeatNumber = this.form.value.seatNumber?.trim() || null;

    this.loadingService.show();
    this.eventRegistrationService.updateSeatNumber(registrationId, trimmedSeatNumber).subscribe({
      next: (response) => {
        this.loadingService.hide();
        this.isSubmitting = false;
        this.toastr.success(
          response.message || this.translationService.instant('eventRegistration.seatNumberUpdated')
        );
        // Close dialog and pass the updated registration data
        this.dialogRef.close(response.result);
      },
      error: (error) => {
        // Hide loading immediately to show error in dialog
        this.loadingService.hide();
        this.isSubmitting = false;

        // Check if it's a duplicate error (400 status code with duplicate info)
        if (error.error?.statusCode === 400 && error.error?.result) {
          const duplicateInfo = error.error.result;

          // Set duplicate error state immediately - this will show in the dialog
          this.duplicateError = error.error.message || this.translationService.instant('eventRegistration.seatNumberDuplicate');
          this.duplicateAttendee = {
            name: duplicateInfo.duplicateAttendeeName || '',
            nameAr: duplicateInfo.duplicateAttendeeNameAr,
            email: duplicateInfo.duplicateAttendeeEmail || '',
            organization: duplicateInfo.duplicateAttendeeOrganization
          };

          // Mark the seat number field as touched to show validation state
          this.form.get('seatNumber')?.markAsTouched();

          // Force Angular to detect changes immediately so error appears instantly
          this.cdr.detectChanges();

          // Don't close dialog - keep it open to show the error
          // User can see the error and modify the seat number
        } else {
          // For other errors, show toast and close dialog
          this.toastr.error(
            error.error?.message || this.translationService.instant('eventRegistration.seatNumberUpdateError')
          );
          this.dialogRef.close(false);
        }
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}

