import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { HttpClient } from '@angular/common/http';
import { User } from '../../../../services/user.service';
import { LoadingService } from '../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';
import { ChangeDetectorRef } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-department-users',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './department-users.component.html',
  styleUrls: ['./department-users.component.scss'],
})
export class DepartmentUsersComponent implements OnInit {
  users: any[] = []; // Using any[] to handle API response structure (UserResponseDto)
  isLoading = false;
  departmentName: string = '';
  departmentId: number = 0;
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  totalItems = 0;
  Math = Math;

  constructor(
    public dialogRef: DialogRef,
    private http: HttpClient,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    if (this.dialogRef.data) {
      this.departmentId = this.dialogRef.data.departmentId || 0;
      this.departmentName = this.dialogRef.data.departmentName || '';
    }
  }

  ngOnInit(): void {
    if (this.departmentId) {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    if (!this.departmentId) return;

    this.isLoading = true;
    this.loadingService.show();
    this.cdr.detectChanges();

    const url = `${environment.baseUrl}/Users?page=${this.currentPage}&pageSize=${this.pageSize}&department=${this.departmentId}`;
    
    this.http.get<any>(url)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          try {
            if (response && response.result) {
              this.users = Array.isArray(response.result) ? response.result : [];
              this.totalItems = response.pagination?.total || response.total || this.users.length;
              this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            } else if (Array.isArray(response)) {
              this.users = response;
              this.totalItems = this.users.length;
              this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            } else {
              this.users = [];
              this.totalItems = 0;
              this.totalPages = 1;
            }
            this.cdr.detectChanges();
          } catch (error) {
            console.error('Error processing users:', error);
            this.toastr.error(
              this.translationService.instant('user.fetchError')
            );
            this.users = [];
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.toastr.error(
            error.error?.message || 
            this.translationService.instant('user.fetchError')
          );
          this.users = [];
          this.cdr.detectChanges();
        },
      });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  getPageNumbers(): number[] {
    const maxVisiblePages = 5;
    const pages: number[] = [];
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  formatDate(date: string | Date): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getJobTitle(user: any): string {
    if (!user) return '-';
    
    // Try jobTitle first (from UserResponseDto)
    if (user.jobTitle) {
      return user.jobTitle.nameEn || user.jobTitle.name || '-';
    }
    
    // Fallback to position (from User interface)
    if (user.position) {
      return user.position.title || '-';
    }
    
    return '-';
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }
}

