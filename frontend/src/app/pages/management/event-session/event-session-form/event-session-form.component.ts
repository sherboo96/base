import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { EventSessionService, EventSession } from '../../../../services/event-session.service';
import { EventService } from '../../../../services/event.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';
import { AttachmentService } from '../../../../services/attachment.service';

@Component({
  selector: 'app-event-session-form',
  templateUrl: './event-session-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class EventSessionFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  events: any[] = [];
  bannerPreview?: string;
  bannerFile?: File;

  constructor(
    private fb: FormBuilder,
    private eventSessionService: EventSessionService,
    private eventService: EventService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ session?: EventSession }>,
    private translationService: TranslationService,
    private attachmentService: AttachmentService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      titleAr: [''],
      description: [''],
      descriptionAr: [''],
      availableSeats: [0, [Validators.required, Validators.min(0)]],
      dateTime: ['', Validators.required],
      eventId: [null, Validators.required],
      banner: ['']
    });
  }

  ngOnInit(): void {
    // Load events first, then initialize form in the callback
    this.loadEvents();
    
    // Initialize form data if editing
    if (this.dialogRef.data?.session) {
      this.isEdit = true;
      const session = this.dialogRef.data.session;
      // Convert API datetime (ISO/UTC) to local datetime-local format
      const dateTime = session.dateTime ? this.convertToLocalDateTime(session.dateTime) : '';
      this.form.patchValue({
        title: session.title || '',
        titleAr: session.titleAr || '',
        description: session.description || '',
        descriptionAr: session.descriptionAr || '',
        availableSeats: session.availableSeats || 0,
        dateTime: dateTime,
        eventId: session.eventId || null,
        banner: session.banner || ''
      });
      if (session.banner) {
        this.bannerPreview = this.attachmentService.getFileUrl(session.banner);
      }
    }
  }

  /**
   * Converts an API datetime (usually ISO, often UTC) to a value suitable for
   * a datetime-local input: YYYY-MM-DDTHH:mm in the user's local time.
   */
  private convertToLocalDateTime(dateTime: string | Date): string {
    if (!dateTime) {
      return '';
    }
    
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Get local date/time components (not UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Return in format: YYYY-MM-DDTHH:mm (local time, no timezone indicator)
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Converts a datetime-local value (YYYY-MM-DDTHH:mm in local time) to ISO string for API.
   * The datetime-local input provides local time, so we need to create a Date object
   * that represents that local time and convert it to ISO.
   */
  private convertLocalDateTimeToISO(dateTimeLocal: string): string {
    if (!dateTimeLocal) {
      return '';
    }
    
    // datetime-local format is already in local time, so we create a Date object
    // which will interpret it as local time, then convert to ISO
    const date = new Date(dateTimeLocal);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return date.toISOString();
  }

  loadEvents(): void {
    this.eventService.getAll(1, 1000).subscribe({
      next: (response) => {
        if (response && response.result && Array.isArray(response.result)) {
          // Create new array reference to trigger change detection
          this.events = response.result.map(event => ({ ...event }));
          this.cdr.detectChanges(); // Force change detection
          
          // If editing and eventId is set, ensure it's selected after events load
          if (this.isEdit && this.dialogRef.data?.session?.eventId) {
            const eventId = this.dialogRef.data.session.eventId;
            const eventExists = this.events.some(e => e.id === eventId);
            if (eventExists) {
              this.form.patchValue({ eventId: eventId });
            }
          }
        } else {
          console.warn('EventService response format unexpected:', response);
          this.events = [];
        }
      },
      error: (error) => {
        console.error('Error loading events:', error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('common.error')
        );
        this.events = [];
      },
    });
  }

  onBannerFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.bannerFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.bannerPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeBanner(): void {
    this.bannerFile = undefined;
    this.bannerPreview = undefined;
    this.form.patchValue({ banner: '' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('common.formInvalid'));
      return;
    }

    this.isSubmitting = true;

    const formData: EventSession = {
      ...this.form.value,
      dateTime: this.convertLocalDateTimeToISO(this.form.value.dateTime)
    };

    if (this.isEdit && this.dialogRef.data?.session?.id) {
      // Update existing session
      this.eventSessionService.update(this.dialogRef.data.session.id, formData).subscribe({
        next: (response) => {
          // Upload banner if provided
          if (this.bannerFile && response.result?.id) {
            this.eventSessionService.uploadBanner(response.result.id, this.bannerFile).subscribe({
              next: () => {
                this.toastr.success(this.translationService.instant('common.success'));
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.isSubmitting = false;
                this.toastr.error(
                  error.error?.message || this.translationService.instant('common.error')
                );
              },
            });
          } else {
            this.toastr.success(this.translationService.instant('common.success'));
            this.dialogRef.close(true);
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this.toastr.error(
            error.error?.message || this.translationService.instant('common.error')
          );
        },
      });
    } else {
      // Create new session
      this.eventSessionService.create(formData).subscribe({
        next: (response) => {
          // Upload banner if provided
          if (this.bannerFile && response.result?.id) {
            this.eventSessionService.uploadBanner(response.result.id, this.bannerFile).subscribe({
              next: () => {
                this.toastr.success(this.translationService.instant('common.success'));
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.isSubmitting = false;
                this.toastr.error(
                  error.error?.message || this.translationService.instant('common.error')
                );
              },
            });
          } else {
            this.toastr.success(this.translationService.instant('common.success'));
            this.dialogRef.close(true);
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this.toastr.error(
            error.error?.message || this.translationService.instant('common.error')
          );
        },
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  trackByEventId(index: number, event: any): any {
    return event?.id || index;
  }
}

