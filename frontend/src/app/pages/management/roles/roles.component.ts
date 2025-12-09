import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { DialogService } from '@ngneat/dialog';
import { LoadingService } from '../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { BehaviorSubject } from 'rxjs';
import { RoleFormComponent } from './role-form/role-form.component';
import { RolePermissionsManagerComponent } from './role-permissions-manager/role-permissions-manager.component';
import { TranslationService } from '../../../services/translation.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './roles.component.html',
})
export class RolesComponent implements OnInit {
  roles: any[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  Math = Math;
  isLoading$ = new BehaviorSubject<boolean>(false);

  constructor(
    private userService: UserService,
    private dialogService: DialogService,
    public loadingService: LoadingService,
    private toastr: ToastrService,
    private router: Router,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading$.next(true);
    this.userService.getRoles(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        // Ensure we're using the result array from response
        this.roles = Array.isArray(response.result) ? response.result : [];
        this.totalItems = response.total || response.pagination?.total || 0;
        this.isLoading$.next(false);
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load roles:', error);
        this.toastr.error(error.error?.message || this.translationService.instant('role.fetchError'));
        this.roles = [];
        this.totalItems = 0;
        this.isLoading$.next(false);
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadRoles();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRoles();
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

  formatDate(dateString: string | Date): string {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  addNewRole(): void {
    const dialogRef = this.dialogService.open(RoleFormComponent, {
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadRoles();
      }
    });
  }

  managePermissions(role: any): void {
    const dialogRef = this.dialogService.open(RolePermissionsManagerComponent, {
      data: { role },
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
        // Reload roles to reflect any changes
        this.loadRoles();
      }
    });
  }

  editRole(role: any): void {
    const dialogRef = this.dialogService.open(RoleFormComponent, {
      data: { role },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadRoles();
      }
    });
  }

  deleteRole(role: any): void {
    const confirmMessage = this.translationService.instant('role.deleteConfirm', { name: role.name });
    if (!confirm(confirmMessage)) {
      return;
    }

    this.loadingService.show();
    this.userService.deleteRole(role.id).subscribe({
      next: () => {
        this.toastr.success(this.translationService.instant('role.deleteSuccess'));
        this.loadRoles();
        this.loadingService.hide();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to delete role:', error);
        this.toastr.error(error.error?.message || this.translationService.instant('role.deleteError'));
        this.loadingService.hide();
      },
    });
  }
}
