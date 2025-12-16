import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EventOrganizationService, EventOrganization, EventOrganizationListResponse } from '../../../services/event-organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DialogService } from '@ngneat/dialog';
import { TranslationService } from '../../../services/translation.service';
import { EventOrganizationFormComponent } from './event-organization-form/event-organization-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-event-organization',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './event-organization.component.html',
  styleUrl: './event-organization.component.scss',
})
export class EventOrganizationComponent implements OnInit, OnDestroy {
  organizations: EventOrganization[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private eventOrganizationService: EventOrganizationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private dialogService: DialogService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.fetchOrganizations();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchOrganizations(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.eventOrganizationService
      .getAll(this.currentPage, this.pageSize, this.searchTerm || undefined)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response: EventOrganizationListResponse) => {
          this.organizations = response.result;
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
    this.fetchOrganizations();
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
    this.fetchOrganizations();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchOrganizations();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.fetchOrganizations();
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }

  addNewOrganization(): void {
    const dialogRef = this.dialogService.open(EventOrganizationFormComponent, {
      data: {},
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchOrganizations();
      }
    });
  }

  editOrganization(organization: EventOrganization): void {
    const dialogRef = this.dialogService.open(EventOrganizationFormComponent, {
      data: { organization },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchOrganizations();
      }
    });
  }

  deleteOrganization(organization: EventOrganization): void {
    if (!organization.id) return;

    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('eventOrganization.deleteTitle'),
        message: this.translationService.instant('eventOrganization.deleteMessage', { name: organization.name }),
        confirmText: this.translationService.instant('common.delete'),
        cancelText: this.translationService.instant('common.cancel'),
        type: 'danger',
        warningMessage: this.translationService.instant('eventOrganization.deleteWarning'),
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
        this.eventOrganizationService.delete(organization.id!).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('eventOrganization.deleteSuccess'));
            this.loadingService.hide();
            this.fetchOrganizations();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('eventOrganization.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }
}

