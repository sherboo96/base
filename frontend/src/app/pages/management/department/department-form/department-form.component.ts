import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { DepartmentService } from '../../../../services/department.service';
import { OrganizationService } from '../../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-department-form',
  templateUrl: './department-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .form-container {
        background: white;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      }
    `,
  ],
})
export class DepartmentFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  organizations: any[] = [];

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ department?: any }>
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      organizationId: ['', Validators.required],
    });

    if (this.dialogRef.data?.department) {
      this.isEdit = true;
      this.form.patchValue({
        name: this.dialogRef.data.department.name,
        organizationId: this.dialogRef.data.department.organizationId,
      });
    }
  }

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.organizationService.getOrganizations(1, 100).subscribe({
      next: (response) => {
        this.organizations = response.result;
      },
      error: (error) => {
        this.toastr.error('Failed to load organizations');
        console.error('Error loading organizations:', error);
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
      this.departmentService
        .updateDepartment(this.dialogRef.data.department.id, formData)
        .subscribe({
          next: () => {
            this.toastr.success('Department updated successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.toastr.error('Failed to update department');
            console.error('Error updating department:', error);
            this.isSubmitting = false;
          },
        });
    } else {
      this.departmentService.createDepartment(formData).subscribe({
        next: () => {
          this.toastr.success('Department created successfully');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error('Failed to create department');
          console.error('Error creating department:', error);
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
