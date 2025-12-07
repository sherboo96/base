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

@Component({
  selector: 'app-location-form',
  templateUrl: './location-form.component.html',
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
export class LocationFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  organizations: any[] = [];
  LocationCategory = LocationCategory;

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
      });
    }

    if (this.dialogRef.data?.organizations) {
      this.organizations = this.dialogRef.data.organizations;
    }
  }

  ngOnInit(): void {}

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
      this.locationService.updateLocation(locationId, formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('location.updateSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('location.updateError')
          );
          this.isSubmitting = false;
        },
      });
    } else {
      this.locationService.createLocation(formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('location.createSuccess'));
          this.dialogRef.close(true);
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
