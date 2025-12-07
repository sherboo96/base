import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserService } from '../../../../services/user.service';
import { PositionService } from '../../../../services/position.service';
import { OrganizationService } from '../../../../services/organization.service';
import { DepartmentService } from '../../../../services/department.service';
import { DialogService } from '../../../../services/dialog.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogRef } from '@ngneat/dialog';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent implements OnInit {
  form: FormGroup;
  positions: any[] = [];
  organizations: any[] = [];
  departments: any[] = [];
  isSubmitting = false;
  isEdit = false;
  isFullNameFromAD = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private positionService: PositionService,
    private organizationService: OrganizationService,
    private departmentService: DepartmentService,
    private dialogService: DialogService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private dialogRef: DialogRef<{ organization?: any }>
  ) {
    this.form = this.fb.group({
      fullName: [{ value: '', disabled: true }, Validators.required],
      email: ['', [Validators.required, Validators.email]],
      adUsername: ['', Validators.required],
      positionId: ['', Validators.required],
      organizationId: ['', Validators.required],
      departmentId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadPositions();
  }

  loadOrganizations(): void {
    this.organizationService.getOrganizations(1, 100).subscribe({
      next: (response) => {
        this.organizations = response.result;
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(
          error.error.message || 'Failed to load organizations'
        );
      },
    });
  }

  loadDepartments(organizationId: string): void {
    this.departmentService.getDepartments(1, 100).subscribe({
      next: (response) => {
        this.departments = response.result.filter(
          (dept: any) => dept.organizationId == organizationId
        );
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(error.error.message || 'Failed to load departments');
      },
    });
  }

  loadPositions(): void {
    this.positionService.getPositions(1, 100).subscribe({
      next: (response) => {
        this.positions = response.result;
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(error.error.message || 'Failed to load positions');
      },
    });
  }

  onOrganizationChange(): void {
    const organizationId = this.form.get('organizationId')?.value;
    if (organizationId) {
      this.loadDepartments(organizationId);
      // Reset department selection when organization changes
      this.form.patchValue({ departmentId: '' });
    } else {
      this.departments = [];
      this.form.patchValue({ departmentId: '' });
    }
  }

  onDepartmentChange(): void {
    const departmentId = this.form.get('departmentId')?.value;
    if (departmentId) {
      // Filter positions based on selected department
      this.positionService.getPositions(1, 100).subscribe({
        next: (response) => {
          this.positions = response.result.filter(
            (pos: any) => pos.departmentId == departmentId
          );
        },
        error: (error: HttpErrorResponse) => {
          this.toastr.error(error.error.message || 'Failed to load positions');
        },
      });
    } else {
      this.loadPositions();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const userData = this.form.value;
    userData.fullName = this.form.get('fullName')?.value;

    if (this.isEdit) {
      this.userService.updateUser(userData).subscribe({
        next: () => {
          this.toastr.success('User updated successfully');
          this.dialogRef.close(true);
        },
        error: (error: HttpErrorResponse) => {
          this.toastr.error('Failed to update user');
          this.isSubmitting = false;
        },
      });
    } else {
      this.userService.createUser(userData).subscribe({
        next: () => {
          this.toastr.success('User created successfully');
          this.form.reset();
          this.dialogRef.close(true);
        },
        error: (error: HttpErrorResponse) => {
          this.toastr.error('Failed to create user');
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel() {
    this.dialogService.closeDialog();
  }

  checkADUser() {
    const adUsername = this.form.get('adUsername')?.value;
    if (!adUsername) return;

    this.loadingService.show();
    this.userService.checkADUser(adUsername).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          // Auto-fill the full name from AD
          this.form.patchValue({
            fullName: response.result.displayName,
            email: response.result.username + '@moo.gov.kw',
          });
          this.isFullNameFromAD = true;
          this.toastr.success('User found in Active Directory');
        } else {
          this.isFullNameFromAD = false;
          this.toastr.error('User not found in Active Directory');
        }
        this.loadingService.hide();
      },
      error: (error: HttpErrorResponse) => {
        this.isFullNameFromAD = false;
        this.toastr.error('User not found in Active Directory');
        this.loadingService.hide();
      },
    });
  }
}
