import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../services/user.service';
import { DialogRef } from '@ngneat/dialog';
import { LoadingService } from '../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { SearchableSelectComponent } from '../../../../components/searchable-select/searchable-select.component';

interface User {
  id: number;
  fullName: string;
  email: string;
}

interface Role {
  id: number;
  name: string;
  systemId: number;
  system?: {
    id: number;
    name: string;
  };
}

interface UserRoleFormData {
  mode: 'create' | 'edit';
  userRole?: any;
}

interface SelectOption {
  id: number;
  name: string;
  email?: string;
  system?: {
    id: number;
    name: string;
  };
}

@Component({
  selector: 'app-user-roles-form',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">
        {{ data.mode === 'create' ? 'Add New User Role' : 'Edit User Role' }}
      </h2>

      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- User Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >User</label
          >
          <app-searchable-select
            [options]="userOptions"
            [value]="selectedUser"
            (valueChange)="selectedUser = $event"
            [disabled]="!!(isLoading$ | async)"
            placeholder="Search and select a user"
          ></app-searchable-select>
        </div>

        <!-- Role Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Role</label
          >
          <app-searchable-select
            [options]="roleOptions"
            [value]="selectedRole"
            (valueChange)="selectedRole = $event"
            [disabled]="!!(isLoading$ | async)"
            placeholder="Search and select a role"
          ></app-searchable-select>
        </div>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            (click)="dialogRef.close()"
            [disabled]="isLoading$ | async"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="!selectedUser || !selectedRole || (isLoading$ | async)"
            class="px-4 py-2 bg-[#c9ae81] hover:bg-[#b89a6e] text-white rounded-lg disabled:opacity-50"
          >
            <span *ngIf="isLoading$ | async">
              <i class="fas fa-spinner fa-spin mr-2"></i>
              {{ data.mode === 'create' ? 'Adding...' : 'Updating...' }}
            </span>
            <span *ngIf="!(isLoading$ | async)">
              {{ data.mode === 'create' ? 'Add' : 'Update' }}
            </span>
          </button>
        </div>
      </form>
    </div>
  `,
})
export class UserRolesFormComponent {
  users: User[] = [];
  roles: Role[] = [];
  userOptions: SelectOption[] = [];
  roleOptions: SelectOption[] = [];
  selectedUser: number | null = null;
  selectedRole: number | null = null;
  data: UserRoleFormData;
  isLoading$ = new BehaviorSubject<boolean>(false);

  constructor(
    public dialogRef: DialogRef,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    this.data = this.dialogRef.data;
    this.loadUsers();
    this.loadRoles();

    if (this.data.mode === 'edit' && this.data.userRole) {
      this.selectedUser = this.data.userRole.userId;
      this.selectedRole = this.data.userRole.roleId;
    }
  }

  loadUsers(): void {
    this.isLoading$.next(true);
    this.userService.getUsers(1, 100).subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          this.users = response.result;
          this.userOptions = response.result.map((user) => ({
            id: user.id,
            name: user.fullName,
            email: user.email,
          }));
        }
        this.isLoading$.next(false);
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.toastr.error('Failed to load users');
        this.isLoading$.next(false);
      },
    });
  }

  loadRoles(): void {
    this.isLoading$.next(true);
    this.userService.getRoles(1, 100).subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          this.roles = response.result;
          this.roleOptions = response.result.map((role: Role) => ({
            id: role.id,
            name: role.name,
            system: role.system,
          }));
        }
        this.isLoading$.next(false);
      },
      error: (error) => {
        console.error('Failed to load roles:', error);
        this.toastr.error('Failed to load roles');
        this.isLoading$.next(false);
      },
    });
  }

  onSubmit(): void {
    if (this.selectedUser && this.selectedRole) {
      this.isLoading$.next(true);
      const userRole = {
        userId: this.selectedUser,
        roleId: this.selectedRole,
      };

      if (this.data.mode === 'create') {
        this.userService.createUserRole(userRole).subscribe({
          next: (response) => {
            if (response.statusCode === 200) {
              this.toastr.success('User role added successfully');
              this.dialogRef.close(true);
            }
            this.isLoading$.next(false);
          },
          error: (error) => {
            console.error('Failed to create user role:', error);
            this.toastr.error(
              error.error?.message || 'Failed to create user role'
            );
            this.isLoading$.next(false);
          },
        });
      } else {
        this.userService
          .updateUserRole(this.data.userRole.userId, userRole)
          .subscribe({
            next: (response) => {
              if (response.statusCode === 200) {
                this.toastr.success('User role updated successfully');
                this.dialogRef.close(true);
              }
              this.isLoading$.next(false);
            },
            error: (error) => {
              console.error('Failed to update user role:', error);
              this.toastr.error(
                error.error?.message || 'Failed to update user role'
              );
              this.isLoading$.next(false);
            },
          });
      }
    }
  }
}
