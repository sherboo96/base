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
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Add New Role</h2>
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

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService,
    public dialogRef: DialogRef
  ) {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // No initialization needed
  }

  onSubmit(): void {
    if (this.roleForm.valid) {
      this.userService.createRole(this.roleForm.value).subscribe({
        next: (response) => {
          this.toastr.success('Role created successfully');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(error.error.message || 'Failed to create role');
        },
      });
    }
  }
}
