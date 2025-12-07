import { Component } from '@angular/core';
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
  selector: 'app-permission-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">
        Add New Permission
      </h2>
      <form [formGroup]="permissionForm" (ngSubmit)="onSubmit()">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Name</label
            >
            <input
              type="text"
              formControlName="name"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9ae81] text-sm"
              placeholder="Enter permission name"
            />
            <div
              *ngIf="
                permissionForm.get('name')?.invalid &&
                permissionForm.get('name')?.touched
              "
              class="text-red-500 text-xs mt-1"
            >
              Name is required
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Code</label
            >
            <input
              type="text"
              formControlName="code"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9ae81] text-sm"
              placeholder="Enter permission code"
            />
            <div
              *ngIf="
                permissionForm.get('code')?.invalid &&
                permissionForm.get('code')?.touched
              "
              class="text-red-500 text-xs mt-1"
            >
              Code is required
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
            [disabled]="permissionForm.invalid"
            class="px-4 py-2 bg-[#c9ae81] text-white rounded-lg hover:bg-[#b89a6e] disabled:opacity-50 text-sm"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PermissionFormComponent {
  permissionForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService,
    public dialogRef: DialogRef
  ) {
    this.permissionForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.permissionForm.valid) {
      this.userService.createPermission(this.permissionForm.value).subscribe({
        next: (response) => {
          this.toastr.success('Permission created successfully');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error.message || 'Failed to create permission'
          );
        },
      });
    }
  }
}
