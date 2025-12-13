import {
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  CourseTab,
  CourseTabService,
  CourseTabResponse,
} from '../../../services/course-tab.service';
import { OrganizationService } from '../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DialogService } from '@ngneat/dialog';
import { CourseTabFormComponent } from './course-tab-form/course-tab-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../services/translation.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-course-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LoadingComponent,
    CourseTabFormComponent,
  ],
  templateUrl: './course-tab.component.html',
  styleUrl: './course-tab.component.scss',
})
export class CourseTabComponent implements OnInit, OnDestroy {
  courseTabs: CourseTab[] = [];
  organizations: any[] = [];
  isLoading = false;
  
  getOrganizationById(id: number): any {
    return this.organizations.find(org => org.id === id);
  }
  
  isMainOrganization(organizationId: number): boolean {
    const org = this.getOrganizationById(organizationId);
    return org?.isMain === true;
  }
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  filterOrganizationId: number | null = null;
  filterShowInMenu: string = 'all'; // 'all', 'true', 'false'
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private courseTabService: CourseTabService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private dialogService: DialogService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchOrganizations();
    this.fetchCourseTabs();
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
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error fetching organizations:', error);
        },
      });
    this.subscriptions.push(sub);
  }

  fetchCourseTabs(): void {
    this.isLoading = true;
    this.loadingService.show();

    const showInMenuFilter = this.filterShowInMenu !== 'all' 
      ? (this.filterShowInMenu === 'true') 
      : undefined;

    const sub = this.courseTabService
      .getCourseTabs(
        this.currentPage,
        this.pageSize,
        this.searchTerm || undefined,
        this.filterOrganizationId || undefined,
        showInMenuFilter
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.courseTabs = response.result;
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.toastr.error(
            error.error.message || this.translationService.instant('courseTab.fetchError')
          );
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchCourseTabs();
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
    this.fetchCourseTabs();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchCourseTabs();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchCourseTabs();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterOrganizationId = null;
    this.filterShowInMenu = 'all';
    this.currentPage = 1;
    this.fetchCourseTabs();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterOrganizationId || this.filterShowInMenu !== 'all');
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
    return isActive ? 'Active' : 'Inactive';
  }

  addNewCourseTab(): void {
    const dialogRef = this.dialogService.open(CourseTabFormComponent, {
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
        this.fetchCourseTabs();
      }
    });
  }

  editCourseTab(courseTab: CourseTab): void {
    const dialogRef = this.dialogService.open(CourseTabFormComponent, {
      data: { courseTab, organizations: this.organizations },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchCourseTabs();
      }
    });
  }

  deleteCourseTab(courseTab: CourseTab): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'danger',
        title: this.translationService.instant('courseTab.deleteTitle'),
        message: this.translationService.instant('courseTab.deleteMessage', { name: courseTab.name }),
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
        this.courseTabService.deleteCourseTab(courseTab.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('courseTab.deleteSuccess'));
            this.loadingService.hide();
            this.fetchCourseTabs();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('courseTab.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  toggleStatus(courseTab: CourseTab): void {
    const isActivating = !courseTab.isActive;
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: isActivating ? 'success' : 'warning',
        title: isActivating
          ? this.translationService.instant('courseTab.activateTitle')
          : this.translationService.instant('courseTab.deactivateTitle'),
        message: isActivating
          ? this.translationService.instant('courseTab.activateMessage', { name: courseTab.name })
          : this.translationService.instant('courseTab.deactivateMessage', { name: courseTab.name }),
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
        this.courseTabService.toggleStatus(courseTab.id).subscribe({
          next: () => {
            this.toastr.success(
              this.translationService.instant(isActivating ? 'courseTab.activateSuccess' : 'courseTab.deactivateSuccess')
            );
            this.loadingService.hide();
            this.fetchCourseTabs();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant(isActivating ? 'courseTab.activateError' : 'courseTab.deactivateError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  toggleShowInMenu(courseTab: CourseTab): void {
    this.loadingService.show();
    this.courseTabService.toggleShowInMenu(courseTab.id).subscribe({
      next: () => {
        this.toastr.success(
          this.translationService.instant('courseTab.toggleMenuSuccess')
        );
        this.loadingService.hide();
        this.fetchCourseTabs();
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('courseTab.toggleMenuError')
        );
        this.loadingService.hide();
      },
    });
  }

  toggleShowPublic(courseTab: CourseTab): void {
    this.loadingService.show();
    this.courseTabService.toggleShowPublic(courseTab.id).subscribe({
      next: () => {
        this.toastr.success(
          this.translationService.instant('courseTab.togglePublicSuccess')
        );
        this.loadingService.hide();
        this.fetchCourseTabs();
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('courseTab.togglePublicError')
        );
        this.loadingService.hide();
      },
    });
  }

  toggleShowForOtherOrganizations(courseTab: CourseTab): void {
    this.loadingService.show();
    // Update the course tab with the new value
    const updatedCourseTab = {
      ...courseTab,
      showForOtherOrganizations: !courseTab.showForOtherOrganizations
    };
    delete (updatedCourseTab as any).id;
    delete (updatedCourseTab as any).createdOn;
    delete (updatedCourseTab as any).organization;
    delete (updatedCourseTab as any).isActive;
    delete (updatedCourseTab as any).isDeleted;
    
    this.courseTabService.updateCourseTab(courseTab.id, updatedCourseTab).subscribe({
      next: () => {
        this.toastr.success(
          this.translationService.instant('courseTab.toggleShowForOtherOrganizationsSuccess')
        );
        this.loadingService.hide();
        this.fetchCourseTabs();
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('courseTab.toggleShowForOtherOrganizationsError')
        );
        this.loadingService.hide();
      },
    });
  }
}
