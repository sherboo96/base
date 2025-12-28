import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { EventOrganizationService, EventOrganization } from '../../../../services/event-organization.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-event-organization-form',
  templateUrl: './event-organization-form.component.html',
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
export class EventOrganizationFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private eventOrganizationService: EventOrganizationService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ organization?: EventOrganization }>,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      nameAr: [''],
      isMain: [false],
    });
  }

  ngOnInit(): void {
    if (this.dialogRef.data?.organization) {
      this.isEdit = true;
      const org = this.dialogRef.data.organization;
      this.form.patchValue({
        name: org.name || '',
        nameAr: org.nameAr || '',
        isMain: org.isMain || false,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('common.formInvalid'));
      return;
    }

    this.isSubmitting = true;

    const formData: EventOrganization = this.form.value;

    if (this.isEdit && this.dialogRef.data?.organization?.id) {
      this.eventOrganizationService.update(this.dialogRef.data.organization.id, formData).subscribe({
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
      this.eventOrganizationService.create(formData).subscribe({
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
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

