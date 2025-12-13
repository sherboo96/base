import {
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  AdoptionUser,
  AdoptionUserService,
  AdoptionUserResponse,
  AttendanceType,
} from '../../../services/adoption-user.service';
import { OrganizationService } from '../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DialogService } from '@ngneat/dialog';
import { AdoptionUserFormComponent } from './adoption-user-form/adoption-user-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-adoption-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LoadingComponent,
  ],
  templateUrl: './adoption-user.component.html',
  styleUrl: './adoption-user.component.scss',
})
export class AdoptionUserComponent implements OnInit, OnDestroy {
  adoptionUsers: AdoptionUser[] = [];
  organizations: any[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  filterOrganizationId: number | null = null;
  Math = Math;
  AttendanceType = AttendanceType;
  private subscriptions: Subscription[] = [];

  constructor(
    private adoptionUserService: AdoptionUserService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private dialogService: DialogService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.fetchOrganizations();
    this.fetchAdoptionUsers();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchOrganizations(): void {
    const sub = this.organizationService
      .getOrganizations(1, 1000)
      .subscribe({
        next: (response) => {
          this.organizations = response.result;
        },
        error: (error) => {
          console.error('Error fetching organizations:', error);
        },
      });
    this.subscriptions.push(sub);
  }

  fetchAdoptionUsers(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.adoptionUserService
      .getAdoptionUsers(
        this.currentPage,
        this.pageSize,
        this.searchTerm || undefined,
        this.filterOrganizationId || undefined
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.adoptionUsers = response.result.map(au => ({
            ...au,
            attendance: typeof au.attendance === 'number' 
              ? au.attendance 
              : Number(au.attendance) || AttendanceType.Optional
          }));
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          this.toastr.error(
            error.error.message || this.translationService.instant('adoptionUser.fetchError')
          );
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchAdoptionUsers();
  }

  getPageNumbers(): number[] {
    const maxVisiblePages = 5;
    const pages: number[] = [];
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.fetchAdoptionUsers();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchAdoptionUsers();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchAdoptionUsers();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterOrganizationId = null;
    this.currentPage = 1;
    this.fetchAdoptionUsers();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.searchTerm ||
      this.filterOrganizationId !== null
    );
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getAttendanceText(attendance: AttendanceType | number | any): string {
    try {
      if (attendance == null || attendance === undefined) {
        return '';
      }
      
      let attendanceValue: number;
      if (typeof attendance === 'number') {
        attendanceValue = attendance;
      } else if (typeof attendance === 'string') {
        attendanceValue = parseInt(attendance, 10);
      } else {
        attendanceValue = Number(attendance) || 0;
      }
      
      if (isNaN(attendanceValue) || attendanceValue === 0) {
        return '';
      }
      
      let translationKey = '';
      switch (attendanceValue) {
        case AttendanceType.Optional:
        case 1:
          translationKey = 'adoptionUser.attendance.optional';
          break;
        case AttendanceType.Mandatory:
        case 2:
          translationKey = 'adoptionUser.attendance.mandatory';
          break;
        default:
          return '';
      }
      
      const translated = this.translationService.instant(translationKey);
      return typeof translated === 'string' ? translated : translationKey;
    } catch (error) {
      console.error('Error getting attendance text:', error, attendance);
      return '';
    }
  }

  getAttendanceClass(attendance: AttendanceType | number | any): string {
    if (attendance == null) {
      return 'bg-gray-100 text-gray-800';
    }
    
    let attendanceValue: number;
    if (typeof attendance === 'number') {
      attendanceValue = attendance;
    } else if (typeof attendance === 'string') {
      attendanceValue = parseInt(attendance, 10);
    } else {
      attendanceValue = Number(attendance) || 0;
    }
    
    if (isNaN(attendanceValue)) {
      return 'bg-gray-100 text-gray-800';
    }
    
    switch (attendanceValue) {
      case AttendanceType.Optional:
      case 1:
        return 'bg-blue-100 text-blue-800';
      case AttendanceType.Mandatory:
      case 2:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive 
      ? this.translationService.instant('common.active') 
      : this.translationService.instant('common.inactive');
  }

  addNewAdoptionUser(): void {
    const dialogRef = this.dialogService.open(AdoptionUserFormComponent, {
      data: { organizations: this.organizations },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchAdoptionUsers();
      }
    });
  }

  editAdoptionUser(adoptionUser: AdoptionUser): void {
    const dialogRef = this.dialogService.open(AdoptionUserFormComponent, {
      data: { adoptionUser, organizations: this.organizations },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchAdoptionUsers();
      }
    });
  }

  deleteAdoptionUser(adoptionUser: AdoptionUser): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'danger',
        title: this.translationService.instant('adoptionUser.deleteTitle'),
        message: this.translationService.instant('adoptionUser.deleteMessage', { name: adoptionUser.name }),
        confirmText: this.translationService.instant('common.delete'),
        cancelText: this.translationService.instant('common.cancel'),
      },
      width: '400px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.adoptionUserService.deleteAdoptionUser(adoptionUser.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('adoptionUser.deleteSuccess'));
            this.loadingService.hide();
            this.fetchAdoptionUsers();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('adoptionUser.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  toggleAdoptionUserStatus(adoptionUser: AdoptionUser): void {
    const isActivating = !adoptionUser.isActive;
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: isActivating ? 'success' : 'warning',
        title: isActivating
          ? this.translationService.instant('adoptionUser.activateTitle')
          : this.translationService.instant('adoptionUser.deactivateTitle'),
        message: isActivating
          ? this.translationService.instant('adoptionUser.activateMessage', { name: adoptionUser.name })
          : this.translationService.instant('adoptionUser.deactivateMessage', { name: adoptionUser.name }),
        confirmText: this.translationService.instant('common.confirm'),
        cancelText: this.translationService.instant('common.cancel'),
      },
      width: '400px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.adoptionUserService.toggleAdoptionUserStatus(adoptionUser.id).subscribe({
          next: () => {
            this.toastr.success(
              isActivating
                ? this.translationService.instant('adoptionUser.activateSuccess')
                : this.translationService.instant('adoptionUser.deactivateSuccess')
            );
            this.loadingService.hide();
            this.fetchAdoptionUsers();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message ||
                (isActivating
                  ? this.translationService.instant('adoptionUser.activateError')
                  : this.translationService.instant('adoptionUser.deactivateError'))
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }
}
