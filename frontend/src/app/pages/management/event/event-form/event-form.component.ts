import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { EventService, Event } from '../../../../services/event.service';
import { AttachmentService } from '../../../../services/attachment.service';
import { LocationService, Location } from '../../../../services/location.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule, FormsModule],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class EventFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  selectedBadgeFile: File | null = null;
  badgePreview: string | null = null;
  locations: Location[] = [];

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private attachmentService: AttachmentService,
    private locationService: LocationService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ event?: Event }>,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      nameAr: [''],
      description: [''],
      descriptionAr: [''],
      code: ['', [Validators.required, Validators.minLength(2)]],
      poster: [''],
      badge: [''],
      date: [null],
      published: [false],
      locationId: [null],
    });
  }

  ngOnInit(): void {
    // Load locations first, then populate form
    this.loadLocations();
  }

  loadLocations(): void {
    this.locationService.getLocations(1, 1000).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.locations = response.result.filter(loc => loc.isActive && !loc.isDeleted);
          
          // After locations are loaded, populate form if editing
          if (this.dialogRef.data?.event) {
            this.isEdit = true;
            const event = this.dialogRef.data.event;
            // Format date for input (YYYY-MM-DD)
            const eventDate = event.date ? new Date(event.date).toISOString().split('T')[0] : null;
            
            this.form.patchValue({
              name: event.name || '',
              nameAr: event.nameAr || '',
              description: event.description || '',
              descriptionAr: event.descriptionAr || '',
              code: event.code || '',
              poster: event.poster || '',
              badge: event.badge || '',
              date: eventDate,
              published: event.published || false,
              locationId: event.locationId || null,
            });
            if (event.poster) {
              this.imagePreview = this.attachmentService.getFileUrl(event.poster);
            }
            if (event.badge) {
              this.badgePreview = this.attachmentService.getFileUrl(event.badge);
            }
          }
          
          // Trigger change detection to update the dropdown
          this.cdr.detectChanges();
        }
      },
      error: () => {
        // Silently fail - locations are optional
          // Still populate form if editing, even if locations fail to load
        if (this.dialogRef.data?.event) {
          this.isEdit = true;
          const event = this.dialogRef.data.event;
          // Format date for input (YYYY-MM-DD)
          const eventDate = event.date ? new Date(event.date).toISOString().split('T')[0] : null;
          
          this.form.patchValue({
            name: event.name || '',
            nameAr: event.nameAr || '',
            description: event.description || '',
            descriptionAr: event.descriptionAr || '',
            code: event.code || '',
            poster: event.poster || '',
            badge: event.badge || '',
            date: eventDate,
            published: event.published || false,
            locationId: event.locationId || null,
          });
          if (event.poster) {
            this.imagePreview = this.attachmentService.getFileUrl(event.poster);
          }
          if (event.badge) {
            this.badgePreview = this.attachmentService.getFileUrl(event.badge);
          }
        }
      },
    });
  }

  getLocationName(location: Location): string {
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && location.nameAr) {
      return location.nameAr;
    }
    return location.name;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.imagePreview = null;
    this.selectedFile = null;
    this.form.patchValue({ poster: '' });
  }

  onBadgeSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedBadgeFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.badgePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeBadge(): void {
    this.badgePreview = null;
    this.selectedBadgeFile = null;
    this.form.patchValue({ badge: '' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('common.formInvalid'));
      return;
    }

    this.isSubmitting = true;

    const posterUploadPromise = this.selectedFile
      ? this.attachmentService.uploadFile(this.selectedFile).toPromise()
      : Promise.resolve(this.form.value.poster || null);

    const badgeUploadPromise = this.selectedBadgeFile
      ? this.attachmentService.uploadFile(this.selectedBadgeFile).toPromise()
      : Promise.resolve(this.form.value.badge || null);

    Promise.all([posterUploadPromise, badgeUploadPromise])
      .then(([imagePath, badgePath]) => {
        // Format date for API (ISO string or null)
        const dateValue = this.form.value.date ? new Date(this.form.value.date).toISOString() : null;
        
        const formData: Event = {
          ...this.form.value,
          poster: imagePath || this.form.value.poster || null,
          badge: badgePath || this.form.value.badge || null,
          date: dateValue,
        };

        if (this.isEdit && this.dialogRef.data?.event?.id) {
          this.eventService.update(this.dialogRef.data.event.id, formData).subscribe({
            next: () => {
              this.toastr.success(this.translationService.instant('common.success'));
              this.dialogRef.close(true);
            },
            error: (error) => {
              this.toastr.error(
                error.error?.message || this.translationService.instant('common.error')
              );
              this.isSubmitting = false;
            },
          });
        } else {
          this.eventService.create(formData).subscribe({
            next: () => {
              this.toastr.success(this.translationService.instant('common.success'));
              this.dialogRef.close(true);
            },
            error: (error) => {
              this.toastr.error(
                error.error?.message || this.translationService.instant('common.error')
              );
              this.isSubmitting = false;
            },
          });
        }
      })
      .catch((error) => {
        this.toastr.error(this.translationService.instant('common.error'));
        this.isSubmitting = false;
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

