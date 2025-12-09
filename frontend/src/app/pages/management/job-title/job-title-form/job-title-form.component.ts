import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { JobTitleService } from '../../../../services/job-title.service';
import { DepartmentService } from '../../../../services/department.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { Department } from '../../../../services/department.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-job-title-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './job-title-form.component.html',
})
export class JobTitleFormComponent implements OnInit {
  form: FormGroup;
  departments: Department[] = [];
  isSubmitting = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private jobTitleService: JobTitleService,
    private departmentService: DepartmentService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ jobTitle?: any }>,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nameEn: ['', Validators.required],
      nameAr: ['', Validators.required],
      code: [''],
      description: [''],
      departmentId: ['', Validators.required],
    });

    if (this.dialogRef.data?.jobTitle) {
      this.isEdit = true;
      this.form.patchValue({
        nameEn: this.dialogRef.data.jobTitle.nameEn,
        nameAr: this.dialogRef.data.jobTitle.nameAr,
        code: this.dialogRef.data.jobTitle.code || '',
        description: this.dialogRef.data.jobTitle.description || '',
        departmentId: this.dialogRef.data.jobTitle.departmentId || '',
      });
    }
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.departmentService.getDepartments(1, 100).subscribe({
      next: (response) => {
        this.departments = response.result;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.toastr.error(error.error.message || 'Failed to load departments');
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.form.value;

    if (this.isEdit) {
      this.jobTitleService
        .updateJobTitle(this.dialogRef.data.jobTitle.id, formData)
        .subscribe({
          next: () => {
            this.toastr.success('Job title updated successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || 'Failed to update job title'
            );
            this.isSubmitting = false;
          },
        });
    } else {
      this.jobTitleService.createJobTitle(formData).subscribe({
        next: () => {
          this.toastr.success('Job title created successfully');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || 'Failed to create job title'
          );
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

