import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { DialogService } from '@ngneat/dialog';
import { UserRolesFormComponent } from './user-roles-form/user-roles-form.component';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog/delete-confirmation-dialog.component';
import { BehaviorSubject } from 'rxjs';
import { LoadingService } from '../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingComponent } from '../../../components/loading/loading.component';

interface UserRole {
  userId: number;
  user: {
    id: number;
    fullName: string;
    email: string;
    adUsername: string;
    positionId: number;
    lastLogin: string;
    failedLoginAttempts: number;
    isLocked: boolean;
    isActive: boolean;
    isDeleted: boolean;
    createdOn: string;
    updatedAt: string;
    updatedBy: string;
  };

  roleId: number;
  role: {
    id: number;
    name: string;
    isActive: boolean;
    isDeleted: boolean;
    createdOn: string;
  };
  isActive: boolean;
  createdOn: string;
}

interface UserRolesResponse {
  statusCode: number;
  message: string;
  result: UserRole[];
  total: number;
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
}

@Component({
  selector: 'app-user-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './user-roles.component.html',
})
export class UserRolesComponent implements OnInit {
  userRoles: UserRole[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  isLoading$ = new BehaviorSubject<boolean>(false);

  constructor(
    private userService: UserService,
    private dialog: DialogService,
    public loadingService: LoadingService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadUserRoles();
  }

  loadUserRoles(): void {
    this.isLoading$.next(true);
    this.userService.getUserRoles(this.currentPage, this.pageSize).subscribe({
      next: (response: UserRolesResponse) => {
        if (response.statusCode === 200) {
          this.userRoles = response.result;
          this.totalItems = response.pagination.total;
        }
        this.isLoading$.next(false);
      },
      error: (error: any) => {
        console.error('Failed to load user roles:', error);
        this.isLoading$.next(false);
      },
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadUserRoles();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUserRoles();
  }


  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUserRoles();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadUserRoles();
    }
  }

  addNewUserRole(): void {
    const dialogRef = this.dialog.open(UserRolesFormComponent, {
      data: { mode: 'create' },
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadUserRoles();
      }
    });
  }

  editUserRole(userRole: UserRole): void {
    const dialogRef = this.dialog.open(UserRolesFormComponent, {
      data: { mode: 'edit', userRole },
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadUserRoles();
      }
    });
  }

  deleteUserRole(userRole: UserRole): void {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent);

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        this.isLoading$.next(true);
        this.userService
          .deleteUserRole(userRole.userId, userRole.roleId)
          .subscribe({
            next: (response) => {
              if (response.statusCode === 200) {
                this.toastr.success('User role deleted successfully');
                this.loadUserRoles();
              }
              this.isLoading$.next(false);
            },
            error: (error) => {
              console.error('Failed to delete user role:', error);
              this.toastr.error(
                error.error?.message || 'Failed to delete user role'
              );
              this.isLoading$.next(false);
            },
          });
      }
    });
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
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
