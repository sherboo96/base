import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EventSpeakerService, EventSpeaker, EventSpeakerListResponse } from '../../../services/event-speaker.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DialogService } from '@ngneat/dialog';
import { TranslationService } from '../../../services/translation.service';
import { EventSpeakerFormComponent } from './event-speaker-form/event-speaker-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-event-speaker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './event-speaker.component.html',
  styleUrl: './event-speaker.component.scss',
})
export class EventSpeakerComponent implements OnInit, OnDestroy {
  speakers: EventSpeaker[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private eventSpeakerService: EventSpeakerService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private dialogService: DialogService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.fetchSpeakers();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchSpeakers(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.eventSpeakerService
      .getAll(this.currentPage, this.pageSize, this.searchTerm || undefined)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response: EventSpeakerListResponse) => {
          this.speakers = response.result;
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
    this.fetchSpeakers();
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
    this.fetchSpeakers();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchSpeakers();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.fetchSpeakers();
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }

  addNewSpeaker(): void {
    const dialogRef = this.dialogService.open(EventSpeakerFormComponent, {
      data: {},
      width: '700px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchSpeakers();
      }
    });
  }

  editSpeaker(speaker: EventSpeaker): void {
    const dialogRef = this.dialogService.open(EventSpeakerFormComponent, {
      data: { speaker },
      width: '700px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchSpeakers();
      }
    });
  }

  deleteSpeaker(speaker: EventSpeaker): void {
    if (!speaker.id) return;

    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('eventSpeaker.deleteTitle'),
        message: this.translationService.instant('eventSpeaker.deleteMessage', { name: speaker.name }),
        confirmText: this.translationService.instant('common.delete'),
        cancelText: this.translationService.instant('common.cancel'),
        type: 'danger',
        warningMessage: this.translationService.instant('eventSpeaker.deleteWarning'),
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
        this.eventSpeakerService.delete(speaker.id!).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('eventSpeaker.deleteSuccess'));
            this.loadingService.hide();
            this.fetchSpeakers();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('eventSpeaker.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }
}

