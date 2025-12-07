import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { DialogService } from '@ngneat/dialog';
import { LoadingService } from '../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { BehaviorSubject } from 'rxjs';
import { RolePermissionFormComponent } from './role-permission-form/role-permission-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingComponent,
    RolePermissionFormComponent,
  ],
  templateUrl: './role-permissions.component.html',
})
export class RolePermissionsComponent implements OnInit {
  rolePermissions: any[] = [];
  searchTerm = '';
  statusFilter = '';
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  Math = Math;
  isLoading$ = new BehaviorSubject<boolean>(false);

  constructor(
    private userService: UserService,
    private dialogService: DialogService,
    public loadingService: LoadingService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadRolePermissions();
  }

  loadRolePermissions(): void {
    this.isLoading$.next(true);
    this.userService
      .getRolePermissions(this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.rolePermissions = response.result;
          this.totalItems = response.total;
          this.isLoading$.next(false);
        },
        error: (error) => {
          this.toastr.error('Failed to load role permissions');
          this.isLoading$.next(false);
        },
      });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadRolePermissions();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRolePermissions();
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

  addNewRolePermission(): void {
    const dialogRef = this.dialogService.open(RolePermissionFormComponent, {
      data: {},
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadRolePermissions();
      }
    });
  }

  editRolePermission(rolePermission: any): void {
    const dialogRef = this.dialogService.open(RolePermissionFormComponent, {
      data: { rolePermission },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadRolePermissions();
      }
    });
  }

  deleteRolePermission(roleId: number, permissionId: number): void {
    const dialogRef = this.dialogService.open(
      DeleteConfirmationDialogComponent,
      {
        data: {
          title: 'Delete Role Permission',
          message:
            'Are you sure you want to delete this role permission? This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
        },
        width: '400px',
        enableClose: true,
        closeButton: true,
        resizable: false,
        draggable: true,
      }
    );

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.userService.deleteRolePermission(roleId, permissionId).subscribe({
          next: () => {
            this.toastr.success('Role permission deleted successfully');
            this.loadRolePermissions();
          },
          error: (error) => {
            this.toastr.error(
              error.error.message || 'Failed to delete role permission'
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  viewRolePermission(rolePermission: any): void {
    const dialogRef = this.dialogService.open(RolePermissionFormComponent, {
      data: {
        rolePermission,
        mode: 'view',
      },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });
  }
}
