import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  JobTitle,
  JobTitleService,
  JobTitleResponse,
} from '../../../services/job-title.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DialogService } from '@ngneat/dialog';
import { JobTitleFormComponent } from './job-title-form/job-title-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-job-title',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './job-title.component.html',
})
export class JobTitleComponent implements OnInit, OnDestroy {
  jobTitles: JobTitle[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private jobTitleService: JobTitleService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private dialogService: DialogService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.fetchJobTitles();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchJobTitles(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.jobTitleService
      .getJobTitles(this.currentPage, this.pageSize)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.jobTitles = response.result;
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          const errorMessage =
            error?.error?.message || error?.message || this.translationService.instant('jobTitle.fetchError');
          this.toastr.error(errorMessage);
          console.error('Error fetching job titles:', error);
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchJobTitles();
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
    this.fetchJobTitles();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchJobTitles();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusClass(isActive: boolean): string {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive 
      ? this.translationService.instant('common.active') 
      : this.translationService.instant('common.inactive');
  }

  addNewJobTitle(): void {
    const dialogRef = this.dialogService.open(JobTitleFormComponent, {
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
        this.fetchJobTitles();
      }
    });
  }

  editJobTitle(jobTitle: JobTitle): void {
    const dialogRef = this.dialogService.open(JobTitleFormComponent, {
      data: { jobTitle },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchJobTitles();
      }
    });
  }

  deleteJobTitle(jobTitle: JobTitle): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'danger',
        title: this.translationService.instant('jobTitle.deleteTitle'),
        message: this.translationService.instant('jobTitle.deleteMessage', { name: jobTitle.nameEn }),
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
        this.jobTitleService.deleteJobTitle(jobTitle.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('jobTitle.deleteSuccess'));
            this.loadingService.hide();
            this.fetchJobTitles();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('jobTitle.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }
}

