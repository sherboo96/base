import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from '../../../services/user.service';
import { OrganizationService } from '../../../services/organization.service';
import { DepartmentService } from '../../../services/department.service';
import { DialogService, DialogConfig } from '@ngneat/dialog';
import { LoadingService } from '../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { UserFormComponent } from './user-form/user-form.component';
import { UserUploadComponent } from './user-upload/user-upload.component';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { TranslationService } from '../../../services/translation.service';
import { ResetPasswordDialogComponent } from '../../../components/reset-password-dialog/reset-password-dialog.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './user.component.html',
})
export class UserComponent implements OnInit {
  users: any[] = [];
  searchTerm = '';
  filterOrganization: number | null = null;
  filterDepartment: number | null = null;
  filterRole: number | null = null;
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  Math = Math;
  
  // Filter options
  organizations: any[] = [];
  departments: any[] = [];
  roles: any[] = [];

  constructor(
    private userService: UserService,
    private organizationService: OrganizationService,
    private departmentService: DepartmentService,
    private dialogService: DialogService,
    public loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadUsers();
  }

  loadFilterOptions(): void {
    // Load organizations
    this.organizationService.getOrganizations(1, 1000).subscribe({
      next: (response) => {
        this.organizations = response.result || [];
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
      }
    });

    // Load departments
    this.departmentService.getAllDepartments().subscribe({
      next: (response) => {
        this.departments = response.result || response || [];
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });

    // Load roles
    this.userService.getRoles(1, 1000).subscribe({
      next: (response) => {
        this.roles = response.result || [];
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      }
    });
  }

  loadUsers(): void {
    console.log('Loading users - Page:', this.currentPage, 'PageSize:', this.pageSize);
    this.loadingService.show();
    this.userService.getUsers(
      this.currentPage, 
      this.pageSize, 
      this.searchTerm || undefined,
      this.filterOrganization || undefined,
      this.filterDepartment || undefined,
      this.filterRole || undefined
    ).subscribe({
      next: (response) => {
        console.log('Users loaded:', response.result.length, 'users');
        this.users = response.result;
        this.totalItems = response.total;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.toastr.error(error.error.message || this.translationService.instant('user.fetchError'));
        this.loadingService.hide();
      },
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterOrganization = null;
    this.filterDepartment = null;
    this.filterRole = null;
    this.currentPage = 1;
    this.loadUsers();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterOrganization || this.filterDepartment || this.filterRole);
  }

  onOrganizationChange(): void {
    // When organization changes, reload departments for that organization
    if (this.filterOrganization) {
      this.departmentService.getAllDepartments(this.filterOrganization).subscribe({
        next: (response) => {
          this.departments = response.result || response || [];
          // Reset department filter if it's not in the new list
          if (this.filterDepartment && !this.departments.find(d => d.id === this.filterDepartment)) {
            this.filterDepartment = null;
          }
        },
        error: (error) => {
          console.error('Error loading departments:', error);
        }
      });
    } else {
      // Load all departments if no organization selected
      this.departmentService.getAllDepartments().subscribe({
        next: (response) => {
          this.departments = response.result || response || [];
        },
        error: (error) => {
          console.error('Error loading departments:', error);
        }
      });
    }
    this.currentPage = 1;
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  addNewUser(): void {
    const dialogRef = this.dialogService.open(UserFormComponent, {
      data: {},
      width: '700px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      console.log('Dialog closed with result:', result);
      if (result) {
        console.log('Reloading users after dialog close...');
        // Add a small delay to ensure backend has processed the request
        setTimeout(() => {
          this.loadUsers();
        }, 300);
      }
    });
  }

  uploadUsers(): void {
    const dialogRef = this.dialogService.open(UserUploadComponent, {
      data: {},
      width: '90vw',
      maxWidth: '900px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload users after successful upload
        setTimeout(() => {
          this.loadUsers();
        }, 500);
      }
    });
  }

  editUser(user: any): void {
    const dialogRef = this.dialogService.open(UserFormComponent, {
      data: { user },
      width: '700px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      console.log('Edit dialog closed with result:', result);
      if (result) {
        console.log('Reloading users after edit...');
        // Add a small delay to ensure backend has processed the request
        setTimeout(() => {
          this.loadUsers();
        }, 300);
      }
    });
  }

  unlockUser(user: any): void {
    this.loadingService.show();
    this.userService.unlockUser(user.id).subscribe({
      next: (response) => {
        this.toastr.success(response.message || this.translationService.instant('user.unlockSuccess'));
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error unlocking user:', error);
        this.toastr.error(error.error?.message || this.translationService.instant('user.unlockError'));
        this.loadingService.hide();
      },
    });
  }

  toggleUserStatus(user: any): void {
    this.loadingService.show();
    this.userService.toggleUserStatus(user.id).subscribe({
      next: (response) => {
        this.toastr.success(response.message || this.translationService.instant('user.toggleStatusSuccess'));
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        this.toastr.error(error.error?.message || this.translationService.instant('user.toggleStatusError'));
        this.loadingService.hide();
      },
    });
  }

  viewUser(user: any): void {
    // Open user form in view/edit mode
    const dialogRef = this.dialogService.open(UserFormComponent, {
      data: { user },
      width: '700px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        setTimeout(() => {
          this.loadUsers();
        }, 300);
      }
    });
  }

  resetPassword(user: any): void {
    // Only reset password for Credentials login method
    if (user.loginMethod !== 3) {
      this.toastr.warning(this.translationService.instant('user.passwordResetNotAvailable'));
      return;
    }

    // Show confirmation dialog
    const confirmDialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('user.resetPassword'),
        message: this.translationService.instant('user.confirmResetPassword'),
        confirmText: this.translationService.instant('user.resetPassword'),
        cancelText: this.translationService.instant('common.cancel'),
        type: 'warning',
        warningMessage: this.translationService.instant('user.passwordResetWarning')
      },
      width: '400px',
      enableClose: true,
      closeButton: true,
    });

    confirmDialogRef.afterClosed$.subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.loadingService.show();
      this.userService.resetUserPassword(user.id).subscribe({
        next: (response) => {
          this.loadingService.hide();
          const newPassword = response.result?.temporaryPassword || response.result?.TemporaryPassword || response.result;
          if (newPassword) {
            // Show password in custom dialog
            const passwordDialogRef = this.dialogService.open(ResetPasswordDialogComponent, {
              data: { password: newPassword },
              width: '500px',
              enableClose: true,
              closeButton: true,
            });

            passwordDialogRef.afterClosed$.subscribe(() => {
              this.loadUsers();
            });
          } else {
            this.toastr.success(response.message || this.translationService.instant('user.passwordResetSuccess'));
            this.loadUsers();
          }
        },
        error: (error) => {
          console.error('Error resetting password:', error);
          this.toastr.error(error.error?.message || this.translationService.instant('user.passwordResetError'));
          this.loadingService.hide();
        },
      });
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get paginationRange(): number[] {
    const range = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(this.totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  }
}
