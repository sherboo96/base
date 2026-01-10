import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EventSessionService, EventSession, EventSessionsResponse } from '../../../services/event-session.service';
import { EventService } from '../../../services/event.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DialogService } from '@ngneat/dialog';
import { TranslationService } from '../../../services/translation.service';
import { EventSessionFormComponent } from './event-session-form/event-session-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { AttachmentService } from '../../../services/attachment.service';
import { EventSessionEnrollmentService } from '../../../services/event-session-enrollment.service';
import { EventSessionEnrollmentsDialogComponent } from './event-session-enrollments-dialog/event-session-enrollments-dialog.component';

@Component({
  selector: 'app-event-session',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './event-session.component.html',
  styleUrl: './event-session.component.scss',
})
export class EventSessionComponent implements OnInit, OnDestroy {
  sessions: EventSession[] = [];
  events: any[] = [];
  isLoading = false;
  pageSize = 20;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  selectedEventId?: number;
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private eventSessionService: EventSessionService,
    private eventService: EventService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private dialogService: DialogService,
    private translationService: TranslationService,
    private attachmentService: AttachmentService,
    private enrollmentService: EventSessionEnrollmentService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.fetchSessions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  loadEvents(): void {
    this.eventService.getAll(1, 1000).subscribe({
      next: (response) => {
        if (response.result) {
          this.events = response.result;
        }
      },
      error: () => {
        // Silently fail
      },
    });
  }

  fetchSessions(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.eventSessionService
      .getAll(
        this.currentPage,
        this.pageSize,
        this.searchTerm || undefined,
        this.selectedEventId
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response: EventSessionsResponse) => {
          this.sessions = response.result;
          this.totalItems = response.total || response.pagination?.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('common.error')
          );
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchSessions();
  }

  getPageNumbers(): number[] {
    const maxVisiblePages = 5;
    const pages: number[] = [];
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
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
    this.fetchSessions();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchSessions();
  }

  onEventFilterChange(): void {
    this.currentPage = 1;
    this.fetchSessions();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedEventId = undefined;
    this.currentPage = 1;
    this.fetchSessions();
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }

  addNewSession(): void {
    const dialogRef = this.dialogService.open(EventSessionFormComponent, {
      data: {},
      width: '800px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload data immediately after successful operation
        this.currentPage = 1;
        this.fetchSessions();
      }
    });
  }

  editSession(session: EventSession): void {
    const dialogRef = this.dialogService.open(EventSessionFormComponent, {
      data: { session },
      width: '800px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload data immediately after successful operation
        this.fetchSessions();
      }
    });
  }

  deleteSession(session: EventSession): void {
    if (!session.id) return;

    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('common.delete'),
        message: this.translationService.instant('common.deleteConfirm'),
      },
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        this.loadingService.show();
        this.eventSessionService.delete(session.id!).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('common.deleteSuccess'));
            this.loadingService.hide();
            // Reload data immediately after successful deletion
            this.fetchSessions();
          },
          error: (error) => {
            this.loadingService.hide();
            this.toastr.error(
              error.error?.message || this.translationService.instant('common.error')
            );
          },
        });
      }
    });
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString();
  }

  getBannerUrl(banner?: string): string {
    if (!banner) return '';
    if (banner.startsWith('http')) return banner;
    return this.attachmentService.getFileUrl(banner);
  }

  getEventName(session: EventSession): string {
    if (session.event) {
      return session.event.name || '';
    }
    const event = this.events.find(e => e.id === session.eventId);
    return event?.name || '';
  }

  viewEnrollments(session: EventSession): void {
    if (!session.id) return;

    const dialogRef = this.dialogService.open(EventSessionEnrollmentsDialogComponent, {
      data: { sessionId: session.id, sessionTitle: session.title },
      width: '1200px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: false,
      resizable: false,
      draggable: true,
      size: 'xl',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Optionally refresh data
      }
    });
  }

  getEnrollmentCount(session: EventSession): string {
    // For now, return a placeholder. This can be enhanced to fetch actual count
    return '-';
  }
}

