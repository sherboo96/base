import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PositionService } from '../../../../services/position.service';
import { DialogRef } from '@ngneat/dialog';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-position-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './position-form.component.html',
})
export class PositionFormComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private positionService: PositionService,
    private dialogRef: DialogRef<{ position?: any }>,
    private toastr: ToastrService,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      nameEn: ['', Validators.required],
      nameAr: [''],
      code: [''],
    });

    if (this.dialogRef.data?.position) {
      this.isEdit = true;
      const position = this.dialogRef.data.position;
      this.form.patchValue({
        nameEn: position.nameEn,
        nameAr: position.nameAr || '',
        code: position.code || '',
      });
    }
  }

  ngOnInit(): void {
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('position.formInvalid'));
      return;
    }

    this.isSubmitting = true;
    const formData = {
      nameEn: this.form.value.nameEn,
      nameAr: this.form.value.nameAr || this.form.value.nameEn,
      code: this.form.value.code || null,
    };
    
    if (this.isEdit) {
      const positionId = this.dialogRef.data.position.id;
      this.positionService.updatePosition(positionId, formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('position.updateSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('position.updateError')
          );
          this.isSubmitting = false;
        },
      });
    } else {
      this.positionService.createPosition(formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('position.createSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('position.createError')
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
