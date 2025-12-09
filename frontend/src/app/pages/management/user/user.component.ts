import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from '../../../services/user.service';
import { DialogService, DialogConfig } from '@ngneat/dialog';
import { LoadingService } from '../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { UserFormComponent } from './user-form/user-form.component';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './user.component.html',
})
export class UserComponent implements OnInit {
  users: any[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  Math = Math;

  constructor(
    private userService: UserService,
    private dialogService: DialogService,
    public loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    console.log('Loading users - Page:', this.currentPage, 'PageSize:', this.pageSize);
    this.loadingService.show();
    this.userService.getUsers(this.currentPage, this.pageSize).subscribe({
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
