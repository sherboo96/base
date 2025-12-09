import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-department-form',
  templateUrl: './department-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
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
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgb(229, 231, 235);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgb(11, 83, 103);
      }
    `,
  ],
})
export class DepartmentFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  organizations: any[] = [];
  mainOrganization: any = null;
  parentDepartments: any[] = [];
  isLoadingParentDepartments = false;
  private isLoadingOrganizations = false;
  private parentDepartmentsLoaded = false;
  private subscriptions: Subscription[] = [];

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
      parentDepartmentId: [{ value: null, disabled: false }],
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
    
    // Subscribe to organizationId changes to reload parent departments
    // Use setTimeout to avoid change detection issues
    setTimeout(() => {
      const orgSub = this.form.get('organizationId')?.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(() => {
          this.parentDepartmentsLoaded = false;
          this.loadParentDepartments();
        });
      
      if (orgSub) {
        this.subscriptions.push(orgSub);
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadOrganizations(): void {
    // Prevent duplicate calls
    if (this.isLoadingOrganizations) {
      return;
    }

    this.isLoadingOrganizations = true;

    if (this.isEdit) {
      // For editing, load all main organizations for dropdown
      const sub = this.organizationService.getOrganizations(1, 100).subscribe({
        next: (response) => {
          this.organizations = response.result.filter(org => org.isMain);
          this.isLoadingOrganizations = false;
          // Load parent departments after organizations are loaded (only once)
          if (!this.parentDepartmentsLoaded && this.form.get('organizationId')?.value) {
            this.loadParentDepartments();
          }
        },
        error: (error) => {
          this.toastr.error('Failed to load organizations');
          console.error('Error loading organizations:', error);
          this.isLoadingOrganizations = false;
        },
      });
      this.subscriptions.push(sub);
    } else {
      // For creating, get main organization directly
      const sub = this.organizationService.getMainOrganization().subscribe({
        next: (response) => {
          if (response.statusCode === 200 && response.result) {
            this.mainOrganization = response.result;
            this.organizations = [this.mainOrganization]; // Set for display
            // Auto-select the main organization
            if (this.mainOrganization.id) {
              this.form.patchValue({
                organizationId: this.mainOrganization.id
              });
              // Parent departments will be loaded via valueChanges subscription
            }
            this.cdr.detectChanges(); // Trigger change detection
          }
          this.isLoadingOrganizations = false;
        },
        error: (error) => {
          this.toastr.error('Failed to load main organization');
          console.error('Error loading main organization:', error);
          this.isLoadingOrganizations = false;
        },
      });
      this.subscriptions.push(sub);
    }
  }

  loadParentDepartments(): void {
    // Prevent duplicate calls
    if (this.isLoadingParentDepartments) {
      return;
    }

    const organizationId = this.isEdit 
      ? this.form.get('organizationId')?.value 
      : this.mainOrganization?.id;
    
    if (!organizationId) {
      // Use setTimeout to avoid change detection errors
      setTimeout(() => {
        this.parentDepartments = [];
        this.isLoadingParentDepartments = false;
        this.parentDepartmentsLoaded = false;
        // Enable/disable form control properly
        const control = this.form.get('parentDepartmentId');
        if (control) {
          control.enable();
        }
      }, 0);
      return;
    }

    this.isLoadingParentDepartments = true;
    // Disable form control properly instead of using [disabled] attribute
    const control = this.form.get('parentDepartmentId');
    if (control) {
      control.disable();
    }
    
    // Use setTimeout to avoid change detection errors when clearing array
    setTimeout(() => {
      this.parentDepartments = [];
      this.parentDepartmentsLoaded = false;
    }, 0);

    const sub = this.departmentService.getAllDepartments().subscribe({
      next: (response: any) => {
        let departments = response.result || [];
        
        // Filter by organization if provided
        if (organizationId) {
          departments = departments.filter(
            (dept: any) => dept.organizationId === organizationId
          );
        }
        
        // Filter out the current department if editing to prevent circular references
        if (this.isEdit && this.dialogRef.data?.department?.id) {
          departments = departments.filter(
            (dept: any) => dept.id !== this.dialogRef.data.department.id
          );
        }
        
        // Use setTimeout to avoid change detection errors
        setTimeout(() => {
          this.parentDepartments = departments;
          this.isLoadingParentDepartments = false;
          this.parentDepartmentsLoaded = true;
          // Enable form control properly
          if (control) {
            control.enable();
          }
          this.cdr.detectChanges();
        }, 0);
      },
      error: (error) => {
        console.error('Error loading parent departments:', error);
        setTimeout(() => {
          this.parentDepartments = [];
          this.isLoadingParentDepartments = false;
          this.parentDepartmentsLoaded = false;
          // Enable form control properly
          if (control) {
            control.enable();
          }
        }, 0);
      },
    });
    
    this.subscriptions.push(sub);
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
