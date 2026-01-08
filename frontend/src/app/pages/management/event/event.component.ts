import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EventService, Event, EventListResponse } from '../../../services/event.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DialogService } from '@ngneat/dialog';
import { TranslationService } from '../../../services/translation.service';
import { EventFormComponent } from './event-form/event-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { EventRegistrationsListComponent } from './event-registrations-list/event-registrations-list.component';
import { SeatingChartComponent } from './event-registrations-list/seating-chart/seating-chart.component';
import { ImagePreviewComponent } from '../../../components/image-preview/image-preview.component';
import { AttachmentService } from '../../../services/attachment.service';
import { EventRegistrationService } from '../../../services/event-registration.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './event.component.html',
  styleUrl: './event.component.scss',
})
export class EventComponent implements OnInit, OnDestroy {
  events: Event[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  filterPublished: string = 'all'; // 'all', 'published', 'unpublished'
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private eventService: EventService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private dialogService: DialogService,
    private translationService: TranslationService,
    private attachmentService: AttachmentService,
    private eventRegistrationService: EventRegistrationService
  ) {}

  ngOnInit(): void {
    this.fetchEvents();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchEvents(): void {
    this.isLoading = true;
    this.loadingService.show();

    const published = this.filterPublished !== 'all' 
      ? (this.filterPublished === 'published' ? true : false)
      : undefined;

    const sub = this.eventService
      .getAll(
        this.currentPage,
        this.pageSize,
        this.searchTerm || undefined,
        published
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response: EventListResponse) => {
          this.events = response.result;
          this.totalItems = response.pagination?.total || 0;
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
    this.fetchEvents();
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
    this.fetchEvents();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchEvents();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.fetchEvents();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterPublished = 'all';
    this.currentPage = 1;
    this.fetchEvents();
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }

  addNewEvent(): void {
    const dialogRef = this.dialogService.open(EventFormComponent, {
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
        this.fetchEvents();
      }
    });
  }

  editEvent(event: Event): void {
    const dialogRef = this.dialogService.open(EventFormComponent, {
      data: { event },
      width: '800px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchEvents();
      }
    });
  }


  getStatusClass(published: boolean): string {
    return published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  }

  getStatusText(published: boolean): string {
    return published 
      ? this.translationService.instant('common.published') 
      : this.translationService.instant('common.draft');
  }

  getLocationName(location: any): string {
    if (!location) return '';
    const currentLang = this.translationService.getCurrentLanguage();
    if (currentLang === 'ar' && location.nameAr) {
      return location.nameAr;
    }
    return location.name || '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const currentLang = this.translationService.getCurrentLanguage();
    
    if (currentLang === 'ar') {
      // Arabic date format: DD/MM/YYYY
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } else {
      // English date format: MM/DD/YYYY or DD/MM/YYYY based on locale
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
  }

  togglePublish(event: Event): void {
    if (!event.id) return;

    const newPublishedStatus = !event.published;
    this.loadingService.show();

    this.eventService.update(event.id, { ...event, published: newPublishedStatus }).subscribe({
      next: () => {
        this.toastr.success(
          this.translationService.instant(
            newPublishedStatus ? 'event.publishSuccess' : 'event.unpublishSuccess'
          )
        );
        this.loadingService.hide();
        this.fetchEvents();
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('common.error')
        );
        this.loadingService.hide();
      },
    });
  }

  openSeatingChart(event: Event): void {
    if (!event.id) return;

    const dialogRef = this.dialogService.open(SeatingChartComponent, {
      data: { eventId: event.id },
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: true,
      draggable: true,
    });
  }

  viewRegistrations(event: Event): void {
    if (!event.id) return;

    const dialogRef = this.dialogService.open(EventRegistrationsListComponent, {
      data: {
        eventId: event.id,
        eventName: event.name,
      },
      width: '95vw',
      maxWidth: '1600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'xl',
    });
  }

  deleteEvent(event: Event): void {
    if (!event.id) return;

    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('event.deleteTitle'),
        message: this.translationService.instant('event.deleteMessage', { name: event.name }),
        confirmText: this.translationService.instant('common.delete'),
        cancelText: this.translationService.instant('common.cancel'),
        type: 'danger',
        warningMessage: this.translationService.instant('event.deleteWarning'),
        showWarning: true,
      },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.eventService.delete(event.id!).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('event.deleteSuccess'));
            this.loadingService.hide();
            this.fetchEvents();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('event.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  previewPoster(event: Event): void {
    if (!event.poster) {
      this.toastr.warning(this.translationService.instant('event.noPoster'));
      return;
    }

    const posterUrl = this.attachmentService.getFileUrl(event.poster);
    
    this.dialogService.open(ImagePreviewComponent, {
      data: {
        imageUrl: posterUrl,
        title: event.name || this.translationService.instant('event.poster'),
        isBadge: false
      },
      width: 'auto',
      maxWidth: 'none',
      enableClose: true,
      closeButton: false,
      resizable: false,
      draggable: false,
    });
  }

  previewBadge(event: Event): void {
    if (!event.code || !event.id) {
      this.toastr.warning(this.translationService.instant('event.noBadge'));
      return;
    }

    // Fetch the first registration for this event to get a sample badge
    this.loadingService.show();
    this.eventRegistrationService.getAll(1, 1, undefined, event.id).subscribe({
      next: (response) => {
        this.loadingService.hide();
        if (response.result && response.result.length > 0) {
          const firstRegistration = response.result[0];
          if (firstRegistration.barcode && firstRegistration.id) {
            // Get badge image by registration ID
            this.eventRegistrationService.getBadgeById(firstRegistration.id).subscribe({
              next: (blob: Blob) => {
                const badgeUrl = URL.createObjectURL(blob);
                this.dialogService.open(ImagePreviewComponent, {
                  data: {
                    imageUrl: badgeUrl,
                    title: `${this.translationService.instant('event.badge')} - ${event.name}`,
                    isBadge: true
                  },
                  width: 'auto',
                  maxWidth: 'none',
                  enableClose: true,
                  closeButton: false,
                  resizable: false,
                  draggable: false,
                });
              },
              error: (error) => {
                this.toastr.error(
                  error.error?.message || this.translationService.instant('event.badgePreviewError')
                );
              },
            });
          } else {
            this.toastr.warning(this.translationService.instant('event.noBadgeForRegistration'));
          }
        } else {
          this.toastr.info(this.translationService.instant('event.noRegistrationsForBadge'));
        }
      },
      error: (error) => {
        this.loadingService.hide();
        this.toastr.error(
          error.error?.message || this.translationService.instant('event.badgePreviewError')
        );
      },
    });
  }
}
