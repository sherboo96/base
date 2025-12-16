import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { LocationService, LocationCategory } from '../../../../services/location.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';
import { environment } from '../../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-location-form',
  templateUrl: './location-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        height: 90vh;
        overflow: hidden;
      }
      
      .dialog-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      
      .form-scroll-container {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: auto;
        scrollbar-color: #0b5367 #f1f1f1;
        -webkit-overflow-scrolling: touch;
      }
      
      .form-scroll-container::-webkit-scrollbar {
        width: 14px;
      }
      
      .form-scroll-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
        margin: 4px 0;
      }
      
      .form-scroll-container::-webkit-scrollbar-thumb {
        background: #0b5367;
        border-radius: 10px;
        border: 2px solid #f1f1f1;
        min-height: 40px;
      }
      
      .form-scroll-container::-webkit-scrollbar-thumb:hover {
        background: #094152;
      }
      
      .form-scroll-container::-webkit-scrollbar-thumb:active {
        background: #062d38;
      }
      
      .dialog-header {
        flex-shrink: 0;
      }
      
      .dialog-actions {
        flex-shrink: 0;
      }
    `,
  ],
})
export class LocationFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  organizations: any[] = [];
  LocationCategory = LocationCategory;
  selectedLogoFile: File | null = null;
  selectedTemplateFile: File | null = null;
  logoPreview: string | null = null;
  templateFileName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ location?: any; organizations?: any[] }>,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nameAr: [''],
      floor: [''],
      building: [''],
      category: [LocationCategory.Onsite, Validators.required],
      organizationId: [null, Validators.required],
      url: [''],
    });

    if (this.dialogRef.data?.location) {
      this.isEdit = true;
      const location = this.dialogRef.data.location;
      this.form.patchValue({
        name: location.name,
        nameAr: location.nameAr,
        floor: location.floor || '',
        building: location.building || '',
        category: typeof location.category === 'number' ? location.category : Number(location.category),
        organizationId: location.organizationId,
        url: location.url || '',
      });
    }

    if (this.dialogRef.data?.organizations) {
      this.organizations = this.dialogRef.data.organizations;
    }
  }

  ngOnInit(): void {}

  onLogoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.toastr.error('Invalid file type. Please select an image file.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.error('File size too large. Maximum size is 5MB.');
        return;
      }
      
      this.selectedLogoFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onTemplateSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                           'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                           'text/html', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        this.toastr.error('Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX, HTML, TXT.');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.toastr.error('File size too large. Maximum size is 10MB.');
        return;
      }
      
      this.selectedTemplateFile = file;
      this.templateFileName = file.name;
    }
  }

  removeLogo(): void {
    this.selectedLogoFile = null;
    this.logoPreview = null;
  }

  removeTemplate(): void {
    this.selectedTemplateFile = null;
    this.templateFileName = null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('location.formInvalid'));
      return;
    }

    this.isSubmitting = true;
    const formData = { ...this.form.value };
    
    // Ensure category is sent as a number (enum value)
    if (typeof formData.category === 'string') {
      formData.category = parseInt(formData.category, 10);
    } else if (formData.category != null) {
      formData.category = Number(formData.category);
    }

    if (this.isEdit) {
      const locationId = this.dialogRef.data.location.id;
      
      // First update the location data
      this.locationService.updateLocation(locationId, formData).subscribe({
        next: () => {
          // Then upload files if selected
          const uploadPromises: Promise<any>[] = [];
          
          if (this.selectedLogoFile) {
            uploadPromises.push(
              firstValueFrom(this.locationService.uploadLogo(locationId, this.selectedLogoFile))
            );
          }
          
          if (this.selectedTemplateFile) {
            uploadPromises.push(
              firstValueFrom(this.locationService.uploadTemplate(locationId, this.selectedTemplateFile))
            );
          }
          
          if (uploadPromises.length > 0) {
            Promise.all(uploadPromises).then(() => {
              this.toastr.success(this.translationService.instant('location.updateSuccess'));
              this.dialogRef.close(true);
              this.isSubmitting = false;
            }).catch((error) => {
              console.error('File upload error:', error);
              this.toastr.warning(this.translationService.instant('location.updateSuccess') + ' But file upload failed.');
              this.dialogRef.close(true);
              this.isSubmitting = false;
            });
          } else {
            this.toastr.success(this.translationService.instant('location.updateSuccess'));
            this.dialogRef.close(true);
            this.isSubmitting = false;
          }
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('location.updateError')
          );
          this.isSubmitting = false;
        },
      });
    } else {
      // Create new location first
      this.locationService.createLocation(formData).subscribe({
        next: (response: any) => {
          const locationId = response.result?.id || response.id;
          
          if (!locationId) {
            this.toastr.error('Failed to get location ID after creation');
            this.isSubmitting = false;
            return;
          }
          
          // Then upload files if selected
          const uploadPromises: Promise<any>[] = [];
          
          if (this.selectedLogoFile) {
            uploadPromises.push(
              firstValueFrom(this.locationService.uploadLogo(locationId, this.selectedLogoFile))
            );
          }
          
          if (this.selectedTemplateFile) {
            uploadPromises.push(
              firstValueFrom(this.locationService.uploadTemplate(locationId, this.selectedTemplateFile))
            );
          }
          
          if (uploadPromises.length > 0) {
            Promise.all(uploadPromises).then(() => {
              this.toastr.success(this.translationService.instant('location.createSuccess'));
              this.dialogRef.close(true);
              this.isSubmitting = false;
            }).catch((error) => {
              console.error('File upload error:', error);
              this.toastr.warning(this.translationService.instant('location.createSuccess') + ' But file upload failed.');
              this.dialogRef.close(true);
              this.isSubmitting = false;
            });
          } else {
            this.toastr.success(this.translationService.instant('location.createSuccess'));
            this.dialogRef.close(true);
            this.isSubmitting = false;
          }
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('location.createError')
          );
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getCategoryText(category: LocationCategory): string {
    switch (category) {
      case LocationCategory.Onsite:
        return this.translationService.instant('location.categories.onsite');
      case LocationCategory.Online:
        return this.translationService.instant('location.categories.online');
      case LocationCategory.OutSite:
        return this.translationService.instant('location.categories.outsite');
      case LocationCategory.Abroad:
        return this.translationService.instant('location.categories.abroad');
      default:
        return '';
    }
  }
}
