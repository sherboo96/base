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
  selectedAgendaFile: File | null = null;
  agendaFileName: string | null = null;
  agendaPreview: string | null = null;
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
      agenda: [''],
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
            // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
            let eventDate = null;
            if (event.date) {
              const date = new Date(event.date);
              // Format as YYYY-MM-DDTHH:mm for datetime-local input
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              eventDate = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
            
            this.form.patchValue({
              name: event.name || '',
              nameAr: event.nameAr || '',
              description: event.description || '',
              descriptionAr: event.descriptionAr || '',
              code: event.code || '',
              poster: event.poster || '',
              badge: event.badge || '',
              agenda: event.agenda || '',
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
            if (event.agenda) {
              this.agendaFileName = event.agenda.split('/').pop() || 'agenda.pdf';
              // Check if agenda is an image and show preview
              const agendaUrl = this.attachmentService.getFileUrl(event.agenda);
              const agendaExtension = event.agenda.split('.').pop()?.toLowerCase();
              if (agendaExtension && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(agendaExtension)) {
                this.agendaPreview = agendaUrl;
              } else {
                this.agendaPreview = null;
              }
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
          // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
          let eventDate = null;
          if (event.date) {
            const date = new Date(event.date);
            // Format as YYYY-MM-DDTHH:mm for datetime-local input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            eventDate = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
          
          this.form.patchValue({
            name: event.name || '',
            nameAr: event.nameAr || '',
            description: event.description || '',
            descriptionAr: event.descriptionAr || '',
            code: event.code || '',
            poster: event.poster || '',
            badge: event.badge || '',
            agenda: event.agenda || '',
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
          if (event.agenda) {
            this.agendaFileName = event.agenda.split('/').pop() || 'agenda.pdf';
            // Check if agenda is an image and show preview
            const agendaUrl = this.attachmentService.getFileUrl(event.agenda);
            const agendaExtension = event.agenda.split('.').pop()?.toLowerCase();
            if (agendaExtension && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(agendaExtension)) {
              this.agendaPreview = agendaUrl;
            } else {
              this.agendaPreview = null;
            }
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

  onAgendaSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type (PDF or image)
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      
      if (!isPdf && !isImage) {
        this.toastr.error(this.translationService.instant('event.agendaMustBePdfOrImage'));
        return;
      }
      
      this.selectedAgendaFile = file;
      this.agendaFileName = file.name;
      
      // If it's an image, show preview
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.agendaPreview = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        this.agendaPreview = null;
      }
    }
  }

  removeAgenda(): void {
    this.agendaFileName = null;
    this.agendaPreview = null;
    this.selectedAgendaFile = null;
    this.form.patchValue({ agenda: '' });
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

    const agendaUploadPromise = this.selectedAgendaFile
      ? this.attachmentService.uploadFile(this.selectedAgendaFile).toPromise()
      : Promise.resolve(this.form.value.agenda || null);

    Promise.all([posterUploadPromise, badgeUploadPromise, agendaUploadPromise])
      .then(([imagePath, badgePath, agendaPath]) => {
        // Format date for API (ISO string or null)
        // datetime-local format is YYYY-MM-DDTHH:mm, convert to ISO string
        let dateValue = null;
        if (this.form.value.date) {
          // datetime-local input returns YYYY-MM-DDTHH:mm format
          // Create Date object from it (will be in local time)
          const date = new Date(this.form.value.date);
          // Convert to ISO string for API
          dateValue = date.toISOString();
        }
        
        const formData: Event = {
          ...this.form.value,
          poster: imagePath || this.form.value.poster || null,
          badge: badgePath || this.form.value.badge || null,
          agenda: agendaPath || this.form.value.agenda || null,
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

