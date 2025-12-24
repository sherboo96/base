import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService, Event } from '../../../services/event.service';
import { EventRegistrationService } from '../../../services/event-registration.service';
import { EventOrganizationService } from '../../../services/event-organization.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingService } from '../../../services/loading.service';
import { AttachmentService } from '../../../services/attachment.service';
import { environment } from '../../../../environments/environment';
import { LanguageSwitcherComponent } from '../../../components/language-switcher/language-switcher.component';
import { TranslationService } from '../../../services/translation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-event-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './event-registration.component.html',
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
export class EventRegistrationComponent implements OnInit, OnDestroy {
  form: FormGroup;
  event: Event | null = null;
  eventCode: string = '';
  isSubmitting = false;
  isSuccess = false;
  eventOrganizations: any[] = [];
  baseUrl = environment.baseUrl;
  currentLang: 'en' | 'ar' = 'en';
  showOtherOrganization = false;
  isLoading = false;
  errorMessage: string | null = null;
  private langSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private eventRegistrationService: EventRegistrationService,
    private eventOrganizationService: EventOrganizationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private attachmentService: AttachmentService,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      nameAr: [''], // Optional field
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      jobTitle: ['', [Validators.required]], // Required field
      eventOrganizationId: [null, [Validators.required]],
      otherOrganization: [''],
    });

    // Watch for organization changes
    this.form.get('eventOrganizationId')?.valueChanges.subscribe((value) => {
      this.showOtherOrganization = value === 'other';
      if (value === 'other') {
        // If "other" is selected, make otherOrganization required and clear eventOrganizationId validation
        this.form.get('otherOrganization')?.setValidators([Validators.required]);
        this.form.get('eventOrganizationId')?.clearValidators();
        this.form.get('eventOrganizationId')?.setValue(null, { emitEvent: false });
      } else if (value) {
        // If a regular organization is selected, make eventOrganizationId required and clear otherOrganization
        this.form.get('eventOrganizationId')?.setValidators([Validators.required]);
        this.form.get('otherOrganization')?.clearValidators();
        this.form.get('otherOrganization')?.setValue('');
      } else {
        // If nothing is selected, make eventOrganizationId required
        this.form.get('eventOrganizationId')?.setValidators([Validators.required]);
        this.form.get('otherOrganization')?.clearValidators();
        this.form.get('otherOrganization')?.setValue('');
      }
      this.form.get('eventOrganizationId')?.updateValueAndValidity({ emitEvent: false });
      this.form.get('otherOrganization')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    // Get current language
    this.currentLang = this.translationService.getCurrentLanguage() as 'en' | 'ar';
    
    // Subscribe to language changes
    this.langSubscription = this.translationService.currentLang$.subscribe((lang) => {
      this.currentLang = lang as 'en' | 'ar';
    });

    this.route.params.subscribe((params) => {
      this.eventCode = params['code'];
      if (this.eventCode) {
        this.loadEvent();
        this.loadEventOrganizations();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.langSubscription) {
      this.langSubscription.unsubscribe();
    }
  }

  loadEvent(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.loadingService.show();
    this.eventService.getByCode(this.eventCode).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.event = response.result;
          if (!this.event.published) {
            this.errorMessage = 'eventRegistration.eventNotPublished';
          }
        } else {
          this.errorMessage = 'eventRegistration.eventNotFound';
        }
        this.isLoading = false;
        this.loadingService.hide();
      },
      error: (error) => {
        this.isLoading = false;
        this.loadingService.hide();
        
        // Handle different error scenarios
        if (error.status === 404) {
          this.errorMessage = 'eventRegistration.eventNotFound';
        } else if (error.status === 401) {
          // For public routes, 401 might mean event is not published or not found
          this.errorMessage = 'eventRegistration.eventNotAccessible';
        } else if (error.status === 0) {
          // Network error
          this.errorMessage = 'eventRegistration.networkError';
        } else {
          this.errorMessage = 'eventRegistration.loadError';
        }
        
        // Don't redirect - show error in view
        console.error('Error loading event:', error);
      },
    });
  }

  loadEventOrganizations(): void {
    this.eventOrganizationService.getAllActive().subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.eventOrganizations = response.result;
        }
      },
      error: () => {
        // Silently fail - organizations are optional
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.event) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    // Check if "other" organization is selected (using showOtherOrganization flag since eventOrganizationId is set to null when "other" is selected)
    const isOtherSelected = this.showOtherOrganization && this.form.value.otherOrganization;

    const registrationData: any = {
      name: this.form.value.name,
      nameAr: this.form.value.nameAr || null, // Optional field
      phone: this.form.value.phone,
      email: this.form.value.email,
      jobTitle: this.form.value.jobTitle || null, // Optional field
      eventId: this.event.id!,
      eventOrganizationId: isOtherSelected ? null : (this.form.value.eventOrganizationId || null),
    };

    // Add otherOrganization only if "other" is selected - backend will create new EventOrganization
    if (isOtherSelected) {
      registrationData.otherOrganization = this.form.value.otherOrganization.trim();
    }

    this.eventRegistrationService.createPublic(registrationData).subscribe({
      next: (response) => {
        if (response.statusCode === 201) {
          this.isSuccess = true;
          this.isSubmitting = false;
          this.form.reset();
          // Scroll to top to show success message
          window.scrollTo({ top: 0, behavior: 'smooth' });
          this.toastr.success('Registration successful! We will review your application and send you a confirmation email with your badge as soon as possible.');
        } else {
          this.toastr.error(response.message || 'Registration failed.');
          this.isSubmitting = false;
        }
      },
      error: (error) => {
        const errorMessage =
          error.error?.message || 'Registration failed. Please try again.';
        this.toastr.error(errorMessage);
        this.isSubmitting = false;
      },
    });
  }

  getPosterUrl(): string {
    if (!this.event?.poster) return '';
    return this.attachmentService.getFileUrl(this.event.poster);
  }

  // Get event name based on current language
  getEventName(): string {
    if (!this.event) return '';
    if (this.currentLang === 'ar' && this.event.nameAr) {
      return this.event.nameAr;
    }
    return this.event.name;
  }

  // Get event description based on current language
  getEventDescription(): string {
    if (!this.event) return '';
    if (this.currentLang === 'ar' && this.event.descriptionAr) {
      return this.event.descriptionAr;
    }
    return this.event.description || '';
  }

  // Get speaker name based on current language
  getSpeakerName(speaker: any): string {
    if (this.currentLang === 'ar' && speaker.nameAr) {
      return speaker.nameAr;
    }
    return speaker.name;
  }

  // Get speaker bio based on current language
  getSpeakerBio(speaker: any): string {
    if (this.currentLang === 'ar' && speaker.bioAr) {
      return speaker.bioAr;
    }
    return speaker.bioEn || '';
  }

  // Get organization name based on current language
  getOrganizationName(org: any): string {
    if (this.currentLang === 'ar' && org.nameAr) {
      return org.nameAr;
    }
    return org.name;
  }

  // Get location name based on current language
  getLocationName(): string {
    if (!this.event?.location) return '';
    if (this.currentLang === 'ar' && this.event.location.nameAr) {
      return this.event.location.nameAr;
    }
    return this.event.location.name;
  }

  // Format date based on current language
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    if (this.currentLang === 'ar') {
      // Arabic date format: DD/MM/YYYY
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    } else {
      // English date format
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    }
  }

  goToEvent(): void {
    if (this.eventCode) {
      this.router.navigate(['/events', this.eventCode]);
    }
  }

  reloadPage(): void {
    window.location.reload();
  }
}

