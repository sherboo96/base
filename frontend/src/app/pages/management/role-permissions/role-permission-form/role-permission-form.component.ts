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
  selector: 'app-role-permission-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">
        Add New Role Permission
      </h2>
      <form [formGroup]="rolePermissionForm" (ngSubmit)="onSubmit()">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Role</label
            >
            <select
              formControlName="roleId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9ae81] text-sm"
            >
              <option value="">Select a role</option>
              <option *ngFor="let role of roles" [value]="role.id">
                {{ role.name }}
              </option>
            </select>
            <div
              *ngIf="
                rolePermissionForm.get('roleId')?.invalid &&
                rolePermissionForm.get('roleId')?.touched
              "
              class="text-red-500 text-xs mt-1"
            >
              Role is required
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Permission</label
            >
            <select
              formControlName="permissionId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9ae81] text-sm"
            >
              <option value="">Select a permission</option>
              <option
                *ngFor="let permission of permissions"
                [value]="permission.id"
              >
                {{ permission.name }}
              </option>
            </select>
            <div
              *ngIf="
                rolePermissionForm.get('permissionId')?.invalid &&
                rolePermissionForm.get('permissionId')?.touched
              "
              class="text-red-500 text-xs mt-1"
            >
              Permission is required
            </div>
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
            [disabled]="rolePermissionForm.invalid"
            class="px-4 py-2 bg-[#c9ae81] text-white rounded-lg hover:bg-[#b89a6e] disabled:opacity-50 text-sm"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  `,
})
export class RolePermissionFormComponent implements OnInit {
  rolePermissionForm: FormGroup;
  roles: any[] = [];
  permissions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService,
    public dialogRef: DialogRef
  ) {
    this.rolePermissionForm = this.fb.group({
      roleId: ['', Validators.required],
      permissionId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles(): void {
    this.userService.getRoles(1, 100).subscribe({
      next: (response) => {
        this.roles = response.result;
      },
      error: (error) => {
        this.toastr.error('Failed to load roles');
      },
    });
  }

  loadPermissions(): void {
    this.userService.getPermissions(1, 100).subscribe({
      next: (response) => {
        this.permissions = response.result;
      },
      error: (error) => {
        this.toastr.error('Failed to load permissions');
      },
    });
  }

  onSubmit(): void {
    if (this.rolePermissionForm.valid) {
      this.userService
        .createRolePermission(this.rolePermissionForm.value)
        .subscribe({
          next: (response) => {
            this.toastr.success('Role permission created successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.toastr.error(
              error.error.message || 'Failed to create role permission'
            );
          },
        });
    }
  }
}
