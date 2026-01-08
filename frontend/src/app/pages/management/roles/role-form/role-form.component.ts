import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserService } from '../../../../services/user.service';
import { OrganizationService } from '../../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">
        {{ isEdit ? 'Edit Role' : 'Add New Role' }}
      </h2>
      <form [formGroup]="roleForm" (ngSubmit)="onSubmit()">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Name</label
            >
            <input
              type="text"
              formControlName="name"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9ae81] text-sm"
              placeholder="Enter role name"
            />
            <div
              *ngIf="
                roleForm.get('name')?.invalid && roleForm.get('name')?.touched
              "
              class="text-red-500 text-xs mt-1"
            >
              Name is required
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Organization
            </label>
            <select
              formControlName="organizationId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9ae81] text-sm"
            >
              <option [value]="null">Select Organization (Optional)</option>
              <option *ngFor="let org of organizations" [value]="org.id">
                {{ org.name }} ({{ org.code }})
              </option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
              Select the organization this role belongs to. Leave empty for roles that apply to all organizations.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Permission Scope
            </label>
            <div class="space-y-2">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  formControlName="applyToAllOrganizations"
                  value="true"
                  class="text-[#c9ae81] focus:ring-[#c9ae81]"
                />
                <span class="text-sm text-gray-700">Apply to All Organizations</span>
              </label>
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  formControlName="applyToAllOrganizations"
                  value="false"
                  class="text-[#c9ae81] focus:ring-[#c9ae81]"
                />
                <span class="text-sm text-gray-700">Apply to Own Organization Only</span>
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Select whether permissions for this role apply to all organizations or only the role's own organization.
            </p>
          </div>

          <div>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                formControlName="isActive"
                class="text-[#c9ae81] focus:ring-[#c9ae81] rounded"
              />
              <span class="text-sm text-gray-700 font-medium">Status (Active)</span>
            </label>
            <p class="text-xs text-gray-500 mt-1">
              If checked, this role will be active and available for assignment. Uncheck to deactivate the role.
            </p>
          </div>

          <div>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                formControlName="isDefault"
                class="text-[#c9ae81] focus:ring-[#c9ae81] rounded"
              />
              <span class="text-sm text-gray-700 font-medium">Set as Default Role for Organization</span>
            </label>
            <p class="text-xs text-gray-500 mt-1">
              If checked, this role will be automatically assigned to new users registering with this organization's email domain.
            </p>
          </div>

          <div>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                formControlName="isFallback"
                class="text-[#c9ae81] focus:ring-[#c9ae81] rounded"
              />
              <span class="text-sm text-gray-700 font-medium">Set as Fallback Role</span>
            </label>
            <p class="text-xs text-gray-500 mt-1">
              If checked, this role will be used as fallback when a user registers and their organization doesn't have a default role.
            </p>
          </div>

        </div>

        <div class="flex justify-end space-x-2 mt-6">
          <button
            type="button"
            (click)="dialogRef.close()"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="roleForm.invalid"
            class="px-4 py-2 bg-[#c9ae81] text-white rounded-lg hover:bg-[#b89a6e] disabled:opacity-50 text-sm"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  `,
})
export class RoleFormComponent implements OnInit {
  roleForm: FormGroup;
  isEdit = false;
  roleId?: number;
  organizations: any[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    public dialogRef: DialogRef<{ role?: any }>
  ) {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      applyToAllOrganizations: ['false'],
      organizationId: [null],
      isActive: [true],
      isDefault: [false],
      isFallback: [false],
    });

    // Check if editing - will populate after organizations are loaded
    if (this.dialogRef.data?.role) {
      this.isEdit = true;
      this.roleId = this.dialogRef.data.role.id;
    }
  }

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.organizationService.getOrganizations(1, 1000).subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          this.organizations = response.result || [];
          
          // Populate form after organizations are loaded (for edit mode)
          if (this.isEdit && this.dialogRef.data?.role) {
            const role = this.dialogRef.data.role;
            
            // Use setTimeout to ensure form is ready and organizations dropdown is populated
            setTimeout(() => {
              // Get organization ID from role (could be direct property or nested in organization object)
              let orgId: number | null = null;
              if (role.organizationId !== undefined && role.organizationId !== null) {
                orgId = role.organizationId;
              } else if (role.organization && role.organization.id) {
                orgId = role.organization.id;
              }
              
              // Convert boolean to string for radio buttons
              const applyToAll = role.applyToAllOrganizations === true || role.applyToAllOrganizations === 'true';
              
              const formValues: any = {
                name: role.name || '',
                applyToAllOrganizations: applyToAll ? 'true' : 'false',
                isActive: role.isActive ?? true,
                isDefault: role.isDefault ?? false,
                isFallback: role.isFallback ?? false,
              };
              
              // Set organizationId (null if not set)
              formValues.organizationId = orgId;
              
              // Patch form values
              this.roleForm.patchValue(formValues, { emitEvent: false });
              
              // Force change detection to update UI
              setTimeout(() => {
                this.roleForm.updateValueAndValidity({ emitEvent: false });
              }, 50);
            }, 100);
          }
        }
      },
      error: (error) => {
        console.error('Failed to load organizations:', error);
      },
    });
  }

  onSubmit(): void {
    if (this.roleForm.valid) {
      const formValue = {
        ...this.roleForm.value,
        applyToAllOrganizations: this.roleForm.value.applyToAllOrganizations === 'true' || this.roleForm.value.applyToAllOrganizations === true,
        organizationId: this.roleForm.value.organizationId || null,
        isActive: this.roleForm.value.isActive === true || this.roleForm.value.isActive === 'true',
        isDefault: this.roleForm.value.isDefault === true || this.roleForm.value.isDefault === 'true',
        isFallback: this.roleForm.value.isFallback === true || this.roleForm.value.isFallback === 'true'
      };
      
      if (this.isEdit && this.roleId) {
        // Update existing role
        this.userService.updateRole(this.roleId, formValue).subscribe({
          next: (response) => {
            this.toastr.success('Role updated successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.toastr.error(error.error?.message || 'Failed to update role');
          },
        });
      } else {
        // Create new role
        this.userService.createRole(formValue).subscribe({
          next: (response) => {
            this.toastr.success('Role created successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.toastr.error(error.error?.message || 'Failed to create role');
          },
        });
      }
    }
  }
}
