import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserService } from '../../../../services/user.service';
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

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService,
    public dialogRef: DialogRef<{ role?: any }>
  ) {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      applyToAllOrganizations: [false],
    });

    // Check if editing
    if (this.dialogRef.data?.role) {
      this.isEdit = true;
      this.roleId = this.dialogRef.data.role.id;
      this.roleForm.patchValue({
        name: this.dialogRef.data.role.name || '',
        applyToAllOrganizations: this.dialogRef.data.role.applyToAllOrganizations ?? false,
      });
    }
  }

  ngOnInit(): void {
    // Initialization complete
  }

  onSubmit(): void {
    if (this.roleForm.valid) {
      const formValue = {
        ...this.roleForm.value,
        applyToAllOrganizations: this.roleForm.value.applyToAllOrganizations === 'true' || this.roleForm.value.applyToAllOrganizations === true
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
        this.userService.createRole({ ...formValue, isActive: true }).subscribe({
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
