import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { InstitutionService } from '../../../../services/institution.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-institution-form',
  templateUrl: './institution-form.component.html',
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
export class InstitutionFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private institutionService: InstitutionService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ institution?: any }>,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nameAr: ['', Validators.required],
    });

    if (this.dialogRef.data?.institution) {
      this.isEdit = true;
      const institution = this.dialogRef.data.institution;
      this.form.patchValue({
        name: institution.name,
        nameAr: institution.nameAr || '',
      });
    }
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('institution.formInvalid'));
      return;
    }

    this.isSubmitting = true;
    const formData = this.form.value;

    if (this.isEdit) {
      const institutionId = this.dialogRef.data.institution.id;
      this.institutionService.updateInstitution(institutionId, formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('institution.updateSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('institution.updateError')
          );
          this.isSubmitting = false;
        },
      });
    } else {
      this.institutionService.createInstitution(formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('institution.createSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('institution.createError')
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
