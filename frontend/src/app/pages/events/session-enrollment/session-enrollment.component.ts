import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventSessionEnrollmentService, SessionInfoResponse } from '../../../services/event-session-enrollment.service';
import { EventOrganizationService } from '../../../services/event-organization.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingService } from '../../../services/loading.service';
import { AttachmentService } from '../../../services/attachment.service';
import { LanguageSwitcherComponent } from '../../../components/language-switcher/language-switcher.component';
import { TranslationService } from '../../../services/translation.service';
import { Subscription } from 'rxjs';
import { DialogService } from '@ngneat/dialog';
import { BadgeHintDialogComponent } from './badge-hint-dialog/badge-hint-dialog.component';

interface SessionInfo {
  id: number;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  dateTime: string;
  banner?: string;
  availableSeats: number;
  totalSeats: number;
  eventId: number;
  eventName?: string;
  eventNameAr?: string;
}

@Component({
  selector: 'app-session-enrollment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './session-enrollment.component.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #ffffff;
      }
    `,
  ],
})
export class SessionEnrollmentComponent implements OnInit, OnDestroy {
  form: FormGroup;
  sessionId: number = 0;
  sessionInfo: SessionInfo | null = null;
  isSubmitting = false;
  isSuccess = false;
  enrollmentResult: any = null;
  eventOrganizations: any[] = [];
  currentLang: 'en' | 'ar' = 'en';
  showOtherOrganization = false;
  isLoading = false;
  errorMessage: string | null = null;
  private langSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private enrollmentService: EventSessionEnrollmentService,
    private eventOrganizationService: EventOrganizationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private attachmentService: AttachmentService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      nameAr: [''], // Optional field
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      barcode: [''], // Optional field
      eventOrganizationId: [null, [Validators.required]],
      otherOrganization: [''],
    });

    // Watch for organization changes
    this.form.get('eventOrganizationId')?.valueChanges.subscribe((value) => {
      this.showOtherOrganization = value === 'other';
      if (value === 'other') {
        this.form.get('otherOrganization')?.setValidators([Validators.required]);
        this.form.get('eventOrganizationId')?.clearValidators();
        this.form.get('eventOrganizationId')?.setValue(null, { emitEvent: false });
      } else if (value) {
        this.form.get('eventOrganizationId')?.setValidators([Validators.required]);
        this.form.get('otherOrganization')?.clearValidators();
        this.form.get('otherOrganization')?.setValue('');
      } else {
        this.form.get('eventOrganizationId')?.setValidators([Validators.required]);
        this.form.get('otherOrganization')?.clearValidators();
        this.form.get('otherOrganization')?.setValue('');
      }
      this.form.get('eventOrganizationId')?.updateValueAndValidity({ emitEvent: false });
      this.form.get('otherOrganization')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.currentLang = this.translationService.getCurrentLanguage() as 'en' | 'ar';
    
    this.langSubscription = this.translationService.currentLang$.subscribe((lang) => {
      this.currentLang = lang as 'en' | 'ar';
      this.cdr.detectChanges();
    });

    this.route.params.subscribe((params) => {
      this.sessionId = +params['sessionId'];
      if (this.sessionId) {
        this.loadSessionInfo();
      }
    });
  }

  ngOnDestroy(): void {
    this.langSubscription?.unsubscribe();
  }

  loadSessionInfo(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.sessionInfo = null; // Clear session info when loading

    this.enrollmentService.getSessionInfo(this.sessionId).subscribe({
      next: (response: SessionInfoResponse) => {
        if (response.statusCode === 200 && response.result) {
          this.sessionInfo = { ...response.result }; // Create new object reference
          this.errorMessage = null; // Clear any previous error
          this.isLoading = false;
          this.cdr.detectChanges(); // Force change detection
          
          // Load organizations after session info is loaded
          this.loadEventOrganizations();
        } else {
          // Session not found or invalid response
          this.sessionInfo = null; // Ensure session info is cleared
          this.errorMessage = response.message || 'Session not found.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        // Handle 404 or other errors
        this.sessionInfo = null; // Ensure session info is cleared
        if (error.status === 404) {
          this.errorMessage = 'Session not found. The session you are looking for does not exist or has been removed.';
        } else {
          this.errorMessage = error.error?.message || 'Failed to load session information. Please try again later.';
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadEventOrganizations(): void {
    this.eventOrganizationService.getAllActive().subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.eventOrganizations = [...response.result]; // Create new array reference
          this.cdr.detectChanges(); // Force change detection
        }
      },
      error: () => {
        // Silently fail - organizations are optional
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.sessionInfo) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const isOtherSelected = this.showOtherOrganization && this.form.value.otherOrganization;

    const enrollmentData: any = {
      name: this.form.value.name,
      nameAr: this.form.value.nameAr || null,
      phone: this.form.value.phone,
      email: this.form.value.email,
      barcode: this.form.value.barcode?.trim()?.toUpperCase() || null, // Optional user-provided barcode
      eventSessionId: this.sessionId,
      eventOrganizationId: isOtherSelected ? null : (this.form.value.eventOrganizationId || null),
    };

    if (isOtherSelected) {
      enrollmentData.otherOrganization = this.form.value.otherOrganization.trim();
    }

    this.enrollmentService.createPublic(this.sessionId, enrollmentData).subscribe({
      next: (response) => {
        if (response.statusCode === 201) {
          this.isSuccess = true;
          this.enrollmentResult = response.result;
          this.isSubmitting = false;
          this.form.reset();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          this.toastr.success('Enrollment successful! Your QR code has been generated.');
        } else {
          this.toastr.error(response.message || 'Enrollment failed.');
          this.isSubmitting = false;
        }
      },
      error: (error) => {
        const errorMessage = error.error?.message || 'Enrollment failed. Please try again.';
        this.toastr.error(errorMessage);
        this.isSubmitting = false;
      },
    });
  }

  getBannerUrl(): string {
    if (!this.sessionInfo?.banner) return '';
    return this.attachmentService.getFileUrl(this.sessionInfo.banner);
  }

  getSessionTitle(): string {
    if (!this.sessionInfo) return '';
    return this.currentLang === 'ar' && this.sessionInfo.titleAr
      ? this.sessionInfo.titleAr
      : this.sessionInfo.title;
  }

  getSessionDescription(): string {
    if (!this.sessionInfo) return '';
    return this.currentLang === 'ar' && this.sessionInfo.descriptionAr
      ? this.sessionInfo.descriptionAr
      : (this.sessionInfo.description || '');
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(this.currentLang === 'ar' ? 'ar-KW' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getQRCodeUrl(): string {
    if (!this.enrollmentResult?.barcode) return '';
    return this.enrollmentService.getQRCode(this.enrollmentResult.barcode);
  }

  reloadPage(): void {
    window.location.reload();
  }

  openBadgeHint(): void {
    this.dialogService.open(BadgeHintDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: false,
      resizable: false,
      draggable: true,
    });
  }
}

