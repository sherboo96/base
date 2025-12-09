import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { DialogService } from '@ngneat/dialog';
import { LoadingService } from '../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { PermissionFormComponent } from './permission-form/permission-form.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, TranslateModule],
  templateUrl: './permissions.component.html',
})
export class PermissionsComponent implements OnInit {
  permissions: any[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  Math = Math;

  constructor(
    private userService: UserService,
    private dialogService: DialogService,
    public loadingService: LoadingService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.loadingService.show();
    this.userService.getPermissions(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.permissions = response.result;
        this.totalItems = response.total;
        this.loadingService.hide();
      },
      error: (error) => {
        this.toastr.error(error.error.message || 'Failed to load permissions');
        this.loadingService.hide();
      },
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadPermissions();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadPermissions();
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

  addNewPermission(): void {
    const dialogRef = this.dialogService.open(PermissionFormComponent, {
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadPermissions();
      }
    });
  }
}
