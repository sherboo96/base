import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { EventRegistrationService, EventRegistration, VipStatus } from '../../../../../services/event-registration.service';
import { EventOrganizationService } from '../../../../../services/event-organization.service';
import { LoadingService } from '../../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../../services/translation.service';

@Component({
  selector: 'app-event-registration-edit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center space-x-3 mb-2">
          <div class="p-2 bg-accent/10 rounded-lg">
            <i class="fas fa-edit text-accent text-xl"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-textDark font-poppins">
              {{ 'eventRegistration.editRegistration' | translate }}
            </h3>
            <p class="text-sm text-gray-600 mt-1 font-poppins">
              {{ 'eventRegistration.editRegistrationDescription' | translate }}
            </p>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Name (English) -->
        <div class="space-y-2">
          <label for="name" class="block text-sm font-medium text-gray-700 font-poppins">
            {{ 'eventRegistration.name' | translate }}
            <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-user text-gray-400"></i>
            </div>
            <input
              id="name"
              type="text"
              formControlName="name"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins"
              [class.border-red-500]="form.get('name')?.invalid && form.get('name')?.touched"
              [placeholder]="'eventRegistration.namePlaceholder' | translate"
              autofocus
            />
          </div>
          <div *ngIf="form.get('name')?.invalid && form.get('name')?.touched" class="flex items-center text-sm text-red-600">
            <i class="fas fa-exclamation-circle mr-1"></i>
            <span>{{ 'eventRegistration.nameRequired' | translate }}</span>
          </div>
        </div>

        <!-- Job Title -->
        <div class="space-y-2">
          <label for="jobTitle" class="block text-sm font-medium text-gray-700 font-poppins">
            {{ 'eventRegistration.jobTitle' | translate }}
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-briefcase text-gray-400"></i>
            </div>
            <input
              id="jobTitle"
              type="text"
              formControlName="jobTitle"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins"
              [placeholder]="'eventRegistration.jobTitlePlaceholder' | translate"
            />
          </div>
        </div>

        <!-- Organization -->
        <div class="space-y-2">
          <label for="eventOrganizationId" class="block text-sm font-medium text-gray-700 font-poppins">
            {{ 'eventRegistration.organization' | translate }}
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-building text-gray-400"></i>
            </div>
            <select
              id="eventOrganizationId"
              formControlName="eventOrganizationId"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 appearance-none bg-white font-poppins"
            >
              <option [ngValue]="null">{{ 'eventRegistration.selectOrganization' | translate }}</option>
              <option *ngFor="let org of eventOrganizations" [ngValue]="org.id">
                {{ org.name }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
            </div>
          </div>
        </div>

        <!-- VIP Status -->
        <div class="space-y-2">
          <label for="vipStatus" class="block text-sm font-medium text-gray-700 font-poppins">
            {{ 'eventRegistration.vipStatus' | translate }}
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-star text-gray-400"></i>
            </div>
            <select
              id="vipStatus"
              formControlName="vipStatus"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 appearance-none bg-white font-poppins"
            >
              <option [value]="0">{{ 'eventRegistration.attendee' | translate }}</option>
              <option [value]="1">{{ 'eventRegistration.vip' | translate }}</option>
              <option [value]="2">{{ 'eventRegistration.vVip' | translate }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
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
export class EventRegistrationEditFormComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  eventOrganizations: any[] = [];
  registration: EventRegistration | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: DialogRef<{ registration: EventRegistration }>,
    private eventRegistrationService: EventRegistrationService,
    private eventOrganizationService: EventOrganizationService,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      jobTitle: [''],
      eventOrganizationId: [null],
      vipStatus: [VipStatus.Attendee]
    });
  }

  ngOnInit(): void {
    const registration = this.dialogRef.data?.registration;
    
    if (!registration) {
      this.toastr.error(this.translationService.instant('eventRegistration.registrationNotFound'));
      this.dialogRef.close(false);
      return;
    }

    this.registration = registration;

    // Load event organizations
    this.loadEventOrganizations();

    // Fetch fresh registration data from API
    if (registration.id) {
      this.eventRegistrationService.getById(registration.id).subscribe({
        next: (response) => {
          if (response.result) {
            this.populateForm(response.result);
          } else {
            this.populateForm(registration);
          }
        },
        error: () => {
          // If API fails, use the passed registration data
          this.populateForm(registration);
        }
      });
    } else {
      this.populateForm(registration);
    }
  }

  loadEventOrganizations(): void {
    this.eventOrganizationService.getAllActive().subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.eventOrganizations = response.result;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading event organizations:', error);
      }
    });
  }

  populateForm(registration: EventRegistration): void {
    this.form.patchValue({
      name: registration.name || '',
      jobTitle: registration.jobTitle || '',
      eventOrganizationId: registration.eventOrganizationId || null,
      vipStatus: this.normalizeVipStatus(registration.vipStatus) ?? VipStatus.Attendee
    });
    this.cdr.detectChanges();
  }

  normalizeVipStatus(vipStatus?: VipStatus | string | number): VipStatus {
    if (vipStatus === null || vipStatus === undefined) return VipStatus.Attendee;
    if (typeof vipStatus === 'string') {
      const statusMap: { [key: string]: VipStatus } = {
        'Attendee': VipStatus.Attendee,
        'VIP': VipStatus.Vip,
        'Vip': VipStatus.Vip,
        'VVIP': VipStatus.VVip,
        'VVip': VipStatus.VVip,
        '0': VipStatus.Attendee,
        '1': VipStatus.Vip,
        '2': VipStatus.VVip
      };
      return statusMap[vipStatus] ?? Number(vipStatus) ?? VipStatus.Attendee;
    }
    return Number(vipStatus) ?? VipStatus.Attendee;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.registration?.id) {
      this.toastr.error(this.translationService.instant('eventRegistration.registrationNotFound'));
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    const updateData: Partial<EventRegistration> = {
      name: this.form.value.name.trim(),
      jobTitle: this.form.value.jobTitle?.trim() || null,
      eventOrganizationId: this.form.value.eventOrganizationId || null,
      vipStatus: this.form.value.vipStatus ?? VipStatus.Attendee
    };

    this.eventRegistrationService.update(this.registration.id, updateData).subscribe({
      next: (response) => {
        this.loadingService.hide();
        this.isSubmitting = false;
        this.toastr.success(
          response.message || this.translationService.instant('eventRegistration.updateSuccess')
        );
        // Close dialog and pass the updated registration data
        this.dialogRef.close(response.result);
      },
      error: (error) => {
        this.loadingService.hide();
        this.isSubmitting = false;
        this.toastr.error(
          error.error?.message || this.translationService.instant('eventRegistration.updateError')
        );
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}

