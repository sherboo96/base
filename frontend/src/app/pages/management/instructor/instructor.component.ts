import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  Instructor,
  InstructorService,
  InstructorResponse,
} from '../../../services/instructor.service';
import { InstitutionService } from '../../../services/institution.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DialogService } from '@ngneat/dialog';
import { InstructorFormComponent } from './instructor-form/instructor-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../services/translation.service';
import { AttachmentService } from '../../../services/attachment.service';

@Component({
  selector: 'app-instructor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, LoadingComponent],
  templateUrl: './instructor.component.html',
})
export class InstructorComponent implements OnInit, OnDestroy {
  instructors: Instructor[] = [];
  institutions: any[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  selectedInstitution: number | null = null;
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private instructorService: InstructorService,
    private institutionService: InstitutionService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private dialogService: DialogService,
    private translationService: TranslationService,
    public attachmentService: AttachmentService
  ) {}

  ngOnInit(): void {
    this.loadInstitutions();
    this.fetchInstructors();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  loadInstitutions(): void {
    this.institutionService.getInstitutions(1, 100).subscribe({
      next: (response) => {
        this.institutions = response.result;
      },
      error: (error) => {
        console.error('Error loading institutions:', error);
      },
    });
  }

  fetchInstructors(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.instructorService
      .getInstructors(this.currentPage, this.pageSize, this.selectedInstitution || undefined)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.instructors = response.result;
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || this.translationService.instant('instructor.fetchError');
          this.toastr.error(errorMessage);
          console.error('Error fetching instructors:', error);
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchInstructors();
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
    this.fetchInstructors();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchInstructors();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.fetchInstructors();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedInstitution = null;
    this.currentPage = 1;
    this.fetchInstructors();
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

  addNewInstructor(): void {
    const dialogRef = this.dialogService.open(InstructorFormComponent, {
      data: { institutions: this.institutions },
      width: '700px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchInstructors();
      }
    });
  }

  editInstructor(instructor: Instructor): void {
    const dialogRef = this.dialogService.open(InstructorFormComponent, {
      data: { instructor, institutions: this.institutions },
      width: '700px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchInstructors();
      }
    });
  }

  deleteInstructor(instructor: Instructor): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('instructor.deleteTitle'),
        message: this.translationService.instant('instructor.deleteMessage', { name: instructor.nameEn }),
        confirmText: this.translationService.instant('common.delete'),
        cancelText: this.translationService.instant('common.cancel'),
        type: 'danger',
        warningMessage: this.translationService.instant('instructor.deleteWarning'),
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
        this.instructorService.deleteInstructor(instructor.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('instructor.deleteSuccess'));
            this.loadingService.hide();
            this.fetchInstructors();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('instructor.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const fallback = img.nextElementSibling as HTMLElement;
      if (fallback) {
        fallback.style.display = 'flex';
      }
    }
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }
}
