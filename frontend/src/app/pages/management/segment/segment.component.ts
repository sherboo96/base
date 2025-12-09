import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  Segment,
  SegmentService,
  SegmentResponse,
} from '../../../services/segment.service';
import { OrganizationService } from '../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DialogService } from '@ngneat/dialog';
import { SegmentFormComponent } from './segment-form/segment-form.component';
import { TranslationService } from '../../../services/translation.service';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-segment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LoadingComponent,
    SegmentFormComponent,
  ],
  templateUrl: './segment.component.html',
  styleUrl: './segment.component.scss',
})
export class SegmentComponent implements OnInit, OnDestroy {
  segments: Segment[] = [];
  organizations: any[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  selectedOrganizationId: number | null = null;
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private segmentService: SegmentService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private dialogService: DialogService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.fetchOrganizations();
    this.fetchSegments();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchOrganizations(): void {
    const sub = this.organizationService.getOrganizations(1, 1000)
      .subscribe({
        next: (response) => {
          this.organizations = response.result;
        },
        error: (error) => {
          console.error('Error loading organizations:', error);
        },
      });
    this.subscriptions.push(sub);
  }

  fetchSegments(): void {
    if (!this.isLoading) {
      this.isLoading = true;
      this.loadingService.show();
    }

    const sub = this.segmentService
      .getSegments(
        this.currentPage,
        this.pageSize,
        this.selectedOrganizationId || undefined
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.segments = response.result;
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('segment.fetchError')
          );
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchSegments();
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
    this.fetchSegments();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchSegments();
  }

  onOrganizationFilterChange(): void {
    this.currentPage = 1;
    this.fetchSegments();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive 
      ? this.translationService.instant('common.active') 
      : this.translationService.instant('common.inactive');
  }

  addNewSegment(): void {
    const dialogRef = this.dialogService.open(SegmentFormComponent, {
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
        this.fetchSegments();
      }
    });
  }

  editSegment(segment: Segment): void {
    const dialogRef = this.dialogService.open(SegmentFormComponent, {
      data: { segment },
      width: '800px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchSegments();
      }
    });
  }

  assignUsersToSegment(segment: Segment): void {
    // Open the form dialog in "assign users" mode
    const dialogRef = this.dialogService.open(SegmentFormComponent, {
      data: { segment, assignUsersMode: true },
      width: '800px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchSegments();
      }
    });
  }

  deleteSegment(segment: Segment): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('segment.deleteTitle'),
        message: this.translationService.instant('segment.deleteMessage', { name: segment.name }),
        confirmText: this.translationService.instant('common.delete'),
        cancelText: this.translationService.instant('common.cancel'),
        type: 'danger',
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
        this.segmentService.deleteSegment(segment.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('segment.deleteSuccess'));
            this.loadingService.hide();
            this.fetchSegments();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('segment.deleteError')
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
