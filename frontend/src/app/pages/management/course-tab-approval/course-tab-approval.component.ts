import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  CourseTabApproval,
  CourseTabApprovalService,
  CourseTabApprovalResponse,
} from '../../../services/course-tab-approval.service';
import { CourseTabService, CourseTab } from '../../../services/course-tab.service';
import { UserService } from '../../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DialogService } from '@ngneat/dialog';
import { CourseTabApprovalFormComponent } from './course-tab-approval-form/course-tab-approval-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../services/translation.service';

interface GroupedApprovals {
  courseTab: CourseTab;
  approvals: CourseTabApproval[];
}

@Component({
  selector: 'app-course-tab-approval',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LoadingComponent,
    CourseTabApprovalFormComponent,
  ],
  templateUrl: './course-tab-approval.component.html',
  styleUrl: './course-tab-approval.component.scss',
})
export class CourseTabApprovalComponent implements OnInit, OnDestroy {
  courseTabs: CourseTab[] = [];
  groupedApprovals: GroupedApprovals[] = [];
  allApprovals: CourseTabApproval[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  filterCourseTabId: number | null = null;
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private courseTabApprovalService: CourseTabApprovalService,
    private courseTabService: CourseTabService,
    private userService: UserService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private dialogService: DialogService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchCourseTabs();
    this.fetchApprovals();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchCourseTabs(): void {
    const sub = this.courseTabService
      .getCourseTabs(1, 1000)
      .subscribe({
        next: (response) => {
          this.courseTabs = response.result || [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching course tabs:', error);
        },
      });
    this.subscriptions.push(sub);
  }

  fetchApprovals(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.courseTabApprovalService
      .getCourseTabApprovals(
        this.currentPage,
        this.pageSize,
        this.filterCourseTabId || undefined
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.allApprovals = response.result || [];
          this.totalItems = response.total || response.pagination?.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.groupApprovalsByCourseTab();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('courseTabApproval.fetchError')
          );
          this.allApprovals = [];
          this.groupedApprovals = [];
          this.cdr.detectChanges();
        },
      });

    this.subscriptions.push(sub);
  }

  groupApprovalsByCourseTab(): void {
    const grouped = new Map<number, GroupedApprovals>();

    // Initialize groups for all course tabs
    this.courseTabs.forEach((tab) => {
      grouped.set(tab.id, {
        courseTab: tab,
        approvals: [],
      });
    });

    // Add approvals to their respective groups
    this.allApprovals.forEach((approval) => {
      const group = grouped.get(approval.courseTabId);
      if (group) {
        group.approvals.push(approval);
      } else {
        // If course tab not found, try to find it in courseTabs array
        const foundCourseTab = this.courseTabs.find(tab => tab.id === approval.courseTabId);
        if (foundCourseTab) {
          grouped.set(approval.courseTabId, {
            courseTab: foundCourseTab,
            approvals: [approval],
          });
        } else {
          // If still not found, create a minimal fallback
          grouped.set(approval.courseTabId, {
            courseTab: {
              id: approval.courseTabId,
              name: approval.courseTab?.name || 'Unknown',
              nameAr: approval.courseTab?.nameAr || 'غير معروف',
              routeCode: approval.courseTab?.routeCode || '',
              organizationId: 0,
              showInMenu: false,
              showPublic: false,
              isActive: true,
              isDeleted: false,
              createdOn: '',
            },
            approvals: [approval],
          });
        }
      }
    });

    // Sort approvals by order within each group
    grouped.forEach((group) => {
      group.approvals.sort((a, b) => a.approvalOrder - b.approvalOrder);
    });

    // Convert to array and filter if needed
    this.groupedApprovals = Array.from(grouped.values())
      .filter((group) => {
        if (this.filterCourseTabId) {
          return group.courseTab.id === this.filterCourseTabId;
        }
        if (this.searchTerm) {
          const searchLower = this.searchTerm.toLowerCase();
          return (
            group.courseTab.name.toLowerCase().includes(searchLower) ||
            group.courseTab.nameAr?.toLowerCase().includes(searchLower) ||
            group.approvals.some((a) =>
              a.role?.name.toLowerCase().includes(searchLower)
            )
          );
        }
        return true;
      })
      .filter((group) => group.approvals.length > 0 || !this.filterCourseTabId);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchApprovals();
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
    this.fetchApprovals();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.groupApprovalsByCourseTab();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchApprovals();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterCourseTabId = null;
    this.currentPage = 1;
    this.fetchApprovals();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterCourseTabId);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  addNewApproval(courseTab?: CourseTab): void {
    const dialogRef = this.dialogService.open(CourseTabApprovalFormComponent, {
      data: {
        courseTabs: this.courseTabs,
        courseTab: courseTab,
      },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchApprovals();
      }
    });
  }

  editApproval(approval: CourseTabApproval): void {
    const dialogRef = this.dialogService.open(CourseTabApprovalFormComponent, {
      data: {
        approval,
        courseTabs: this.courseTabs,
      },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchApprovals();
      }
    });
  }

  deleteApproval(approval: CourseTabApproval): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'danger',
        title: this.translationService.instant('courseTabApproval.deleteTitle'),
        message: this.translationService.instant('courseTabApproval.deleteMessage', {
          order: approval.approvalOrder,
          courseTab: approval.courseTab?.name || 'Unknown',
        }),
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
        this.courseTabApprovalService.deleteCourseTabApproval(approval.id!).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('courseTabApproval.deleteSuccess'));
            this.loadingService.hide();
            this.fetchApprovals();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('courseTabApproval.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }
}
