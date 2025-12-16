import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LogService, Log } from '../../../services/log.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { TranslationService } from '../../../services/translation.service';
import { DialogService } from '@ngneat/dialog';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { StorageService } from '../../../services/storage.service';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.scss',
})
export class LogsComponent implements OnInit {
  logs: Log[] = [];
  filteredLogs: Log[] = [];
  searchTerm = '';
  selectedLevel = '';
  levels: string[] = [];
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;
  totalItems = 0;
  startDate?: string; // Store as string for date input binding
  endDate?: string; // Store as string for date input binding
  selectedLog?: Log;
  Math = Math; // Expose Math to template
  isLoggingEnabled = true;

  get hasActiveFilters(): boolean {
    return !!(
      this.searchTerm?.trim() ||
      this.selectedLevel ||
      this.startDate ||
      this.endDate
    );
  }

  hasPermission(permissionCode: string): boolean {
    // Check if user has SuperAdmin role
    const userRoles = this.storageService.getItem<any[]>('userRoles');
    const isSuperAdmin = userRoles?.some((role: any) => role.name === 'SuperAdmin');

    // SuperAdmin has access to everything
    if (isSuperAdmin) {
      return true;
    }

    // Get user permissions from storage
    const userPermissions = this.storageService.getItem<any[]>('userPermissions') || [];
    
    // Check if user has the permission
    const hasPermission = userPermissions.some((p) => {
      if (typeof p === 'string') {
        return p === permissionCode;
      }
      return p && (p.code === permissionCode || p === permissionCode);
    });
    
    return hasPermission;
  }

  constructor(
    private logService: LogService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.loadLevels();
    this.loadLogs();
    this.loadLoggingStatus();
  }

  loadLoggingStatus(): void {
    this.logService.getLoggingStatus().subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          this.isLoggingEnabled = response.result ?? true;
        }
      },
      error: (error) => {
        console.error('Error loading logging status:', error);
        this.isLoggingEnabled = true; // Default to enabled
      },
    });
  }

  toggleLogging(): void {
    const newStatus = !this.isLoggingEnabled;
    this.loadingService.show();
    this.logService.toggleLogging(newStatus).subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          this.isLoggingEnabled = newStatus;
          this.toastr.success(
            this.translationService.instant(
              newStatus ? 'logs.loggingEnabled' : 'logs.loggingDisabled'
            )
          );
        }
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error toggling logging:', error);
        this.toastr.error(
          error.error?.message ||
            this.translationService.instant('logs.toggleError')
        );
        this.loadingService.hide();
      },
    });
  }

  deleteFilteredLogs(): void {
    const dialogRef = this.dialogService.open(ConfirmDialogComponent, {
      data: {
        title: this.translationService.instant('logs.deleteTitle'),
        message: this.translationService.instant('logs.deleteConfirm'),
        warningMessage: this.translationService.instant('logs.deleteWarning'),
        confirmText: this.translationService.instant('common.delete'),
        cancelText: this.translationService.instant('common.cancel'),
      },
      width: '450px',
      enableClose: true,
      closeButton: false,
      resizable: false,
      draggable: false,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        // Convert string dates to Date objects if they exist
        const startDateObj = this.startDate ? new Date(this.startDate) : undefined;
        const endDateObj = this.endDate ? new Date(this.endDate) : undefined;
        
        this.logService
          .deleteLogs(
            this.searchTerm || undefined,
            this.selectedLevel || undefined,
            startDateObj,
            endDateObj
          )
          .subscribe({
            next: (response) => {
              if (response.statusCode === 200) {
                const count = response.result || 0;
                this.toastr.success(
                  this.translationService.instant('logs.deleteSuccess', {
                    count: count,
                  })
                );
                this.loadLogs(); // Reload logs after deletion
              }
              this.loadingService.hide();
            },
            error: (error) => {
              console.error('Error deleting logs:', error);
              this.toastr.error(
                error.error?.message ||
                  this.translationService.instant('logs.deleteError')
              );
              this.loadingService.hide();
            },
          });
      }
    });
  }

  loadLevels(): void {
    this.logService.getLevels().subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          // Defer update to next change detection cycle to avoid ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            this.levels = response.result;
          }, 0);
        }
      },
      error: (error) => {
        console.error('Error loading log levels:', error);
      },
    });
  }

  loadLogs(): void {
    this.loadingService.show();
    // Convert string dates to Date objects if they exist
    const startDateObj = this.startDate ? new Date(this.startDate) : undefined;
    const endDateObj = this.endDate ? new Date(this.endDate) : undefined;
    
    this.logService
      .getAll(
        this.currentPage,
        this.pageSize,
        this.searchTerm || undefined,
        this.selectedLevel || undefined,
        startDateObj,
        endDateObj
      )
      .subscribe({
        next: (response) => {
          if (response.statusCode === 200) {
            this.logs = response.result || [];
            this.filteredLogs = [...this.logs];
            this.totalItems = response.total || 0;
            // Calculate total pages from pagination or total items
            const pageSize = response.pagination?.pageSize || this.pageSize;
            this.totalPages = pageSize > 0 ? Math.ceil(this.totalItems / pageSize) : 1;
          }
          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Error loading logs:', error);
          this.toastr.error(
            error.error?.message ||
              this.translationService.instant('logs.fetchError')
          );
          this.loadingService.hide();
        },
      });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  onLevelChange(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  onDateChange(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedLevel = '';
    this.startDate = undefined;
    this.endDate = undefined;
    this.currentPage = 1;
    this.loadLogs();
  }

  viewDetails(log: Log): void {
    this.selectedLog = log;
  }

  closeDetails(): void {
    this.selectedLog = undefined;
  }

  getLevelClass(level: string): string {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'INFORMATION':
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'DEBUG':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadLogs();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadLogs();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadLogs();
    }
  }
}

