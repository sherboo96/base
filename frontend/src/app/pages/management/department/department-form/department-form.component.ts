import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  mainOrganization: any = null;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ department?: any }>,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nameEn: ['', Validators.required],
      nameAr: ['', Validators.required],
      code: [''],
      type: ['', Validators.required],
      level: ['', Validators.required],
      organizationId: ['', Validators.required],
      parentDepartmentId: [null],
    });

    if (this.dialogRef.data?.department) {
      this.isEdit = true;
      this.form.patchValue({
        nameEn: this.dialogRef.data.department.nameEn || this.dialogRef.data.department.name || '',
        nameAr: this.dialogRef.data.department.nameAr || '',
        code: this.dialogRef.data.department.code || '',
        type: this.dialogRef.data.department.type || '',
        level: this.dialogRef.data.department.level || '',
        organizationId: this.dialogRef.data.department.organizationId,
        parentDepartmentId: this.dialogRef.data.department.parentDepartmentId || null,
      });
    }
  }

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    if (this.isEdit) {
      // For editing, load all main organizations for dropdown
      this.organizationService.getOrganizations(1, 100).subscribe({
        next: (response) => {
          this.organizations = response.result.filter(org => org.isMain);
        },
        error: (error) => {
          this.toastr.error('Failed to load organizations');
          console.error('Error loading organizations:', error);
        },
      });
    } else {
      // For creating, get main organization directly
      this.organizationService.getMainOrganization().subscribe({
        next: (response) => {
          if (response.statusCode === 200 && response.result) {
            this.mainOrganization = response.result;
            this.organizations = [this.mainOrganization]; // Set for display
            // Auto-select the main organization
            if (this.mainOrganization.id) {
              this.form.patchValue({
                organizationId: this.mainOrganization.id
              });
            }
            this.cdr.detectChanges(); // Trigger change detection
          }
        },
        error: (error) => {
          this.toastr.error('Failed to load main organization');
          console.error('Error loading main organization:', error);
        },
      });
    }
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
