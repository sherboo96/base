import {
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  Course,
  CourseService,
  CourseResponse,
  CourseStatus,
  TargetUserType,
} from '../../../services/course.service';
import { CourseTabService } from '../../../services/course-tab.service';
import { OrganizationService } from '../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { DialogService } from '@ngneat/dialog';
import { CourseFormComponent } from './course-form/course-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../services/translation.service';
import { ChangeDetectorRef } from '@angular/core';
import { StorageService } from '../../../services/storage.service';
import { AttachmentService } from '../../../services/attachment.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { LocationService } from '../../../services/location.service';

@Component({
  selector: 'app-course',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LoadingComponent,
  ],
  templateUrl: './course.component.html',
  styleUrl: './course.component.scss',
})
export class CourseComponent implements OnInit, OnDestroy {
  courses: Course[] = [];
  courseTabs: any[] = [];
  organizations: any[] = [];
  isLoading = false;
  pageSize = 20;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  filterOrganizationId: number | null = null;
  filterCourseTabId: number | null = null;
  filterStatus: string = 'all';
  filterStartDateFrom: string = '';
  filterStartDateTo: string = '';
  filterEndDateFrom: string = '';
  filterEndDateTo: string = '';
  filterLocationId: number | null = null;
  locations: any[] = [];
  Math = Math;
  CourseStatus = CourseStatus;
  private subscriptions: Subscription[] = [];
  selectedCourseTabId: number | null = null;
  isPublicView = false; // Flag to determine if this is public view (no actions)

  constructor(
    private courseService: CourseService,
    private courseTabService: CourseTabService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private route: ActivatedRoute,
    private dialogService: DialogService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private storageService: StorageService,
    private attachmentService: AttachmentService,
    private enrollmentService: EnrollmentService,
    private locationService: LocationService
  ) {}

  getLocationLogoUrl(logoPath: string | undefined): string {
    if (!logoPath) return '';
    return this.attachmentService.getFileUrl(logoPath);
  }

  ngOnInit(): void {
    // Subscribe to route parameter changes to handle routeCode changes
    const paramsSub = this.route.params.subscribe(params => {
      const routeCode = params['routeCode'];
      
      if (routeCode) {
        // Public view - filter by routeCode
        this.isPublicView = true;
        this.loadCourseTabByRouteCode(routeCode);
      } else {
        // Management view
        this.isPublicView = false;
        // Get courseTabId from route params if available
        const courseTabIdParam = params['courseTabId'];
        if (courseTabIdParam) {
          this.selectedCourseTabId = +courseTabIdParam;
          this.filterCourseTabId = this.selectedCourseTabId;
        }

        this.fetchOrganizations();
        this.fetchCourseTabs();
        this.fetchLocations();
        this.fetchCourses();
      }
    });
    this.subscriptions.push(paramsSub);
  }

  loadCourseTabByRouteCode(routeCode: string): void {
    // Reset filters and state when routeCode changes
    this.currentPage = 1;
    this.searchTerm = '';
    this.filterOrganizationId = null;
    this.filterLocationId = null;
    this.filterStartDateFrom = '';
    this.filterStartDateTo = '';
    this.filterEndDateFrom = '';
    this.filterEndDateTo = '';
    this.selectedCourseTabId = null;
    this.filterCourseTabId = null;
    
    // Load course tab by route code
    const sub = this.courseTabService.getCourseTabByRouteCode(routeCode).subscribe({
      next: (response: any) => {
        const courseTab = response.result || response;
        if (courseTab) {
          this.selectedCourseTabId = courseTab.id;
          this.filterCourseTabId = courseTab.id;
          this.fetchCourseTabs();
          this.fetchLocations();
          this.fetchCourses();
        } else {
          this.toastr.error('Course tab not found');
          this.courses = [];
          this.totalItems = 0;
          this.totalPages = 1;
        }
      },
      error: (error) => {
        console.error('Error loading course tab:', error);
        this.toastr.error('Course tab not found');
        this.courses = [];
        this.totalItems = 0;
        this.totalPages = 1;
      },
    });
    this.subscriptions.push(sub);
  }

  fetchLocations(): void {
    if (this.isPublicView) {
      // In public view, fetch locations for filtering
      this.locationService.getLocations(1, 1000).subscribe({
        next: (response) => {
          this.locations = response.result || [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading locations:', error);
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchOrganizations(): void {
    if (this.isPublicView) {
      // Don't fetch organizations in public view
      return;
    }
    
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
    if (this.isPublicView) {
      // In public view, we already have the course tab from routeCode
      // Just add it to the courseTabs array for display
      if (this.selectedCourseTabId) {
        const currentUser = this.storageService.getItem<any>('currentUser');
        const userOrganizationId = currentUser?.organizationId || currentUser?.organization?.id;

        const sub = this.courseTabService
          .getCourseTabs(1, 1000, undefined, userOrganizationId)
          .subscribe({
            next: (response) => {
              const allTabs = response.result || [];
              this.courseTabs = allTabs.filter(tab => tab.id === this.selectedCourseTabId);
              this.cdr.detectChanges();
            },
            error: (error) => {
              console.error('Error loading course tabs:', error);
            },
          });
        this.subscriptions.push(sub);
      }
      return;
    }
    
    const currentUser = this.storageService.getItem<any>('currentUser');
    const userOrganizationId = currentUser?.organizationId || currentUser?.organization?.id;

    const sub = this.courseTabService
      .getCourseTabs(1, 1000, undefined, userOrganizationId)
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

  fetchCourses(): void {
    this.isLoading = true;
    this.loadingService.show();

    // In public view, only show published courses
    const statusFilter = this.isPublicView 
      ? CourseStatus.Published
      : (this.filterStatus !== 'all' 
          ? CourseStatus[this.filterStatus as keyof typeof CourseStatus] as CourseStatus
          : undefined);

    const sub = this.courseService
      .getCourses(
        this.currentPage,
        this.pageSize,
        this.searchTerm || undefined,
        this.filterOrganizationId || undefined,
        this.filterCourseTabId || undefined,
        statusFilter,
        this.filterStartDateFrom || undefined,
        this.filterStartDateTo || undefined,
        this.filterEndDateFrom || undefined,
        this.filterEndDateTo || undefined,
        this.filterLocationId || undefined
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          // Backend now handles target user filtering, so we can use the response directly
          this.courses = response.result;
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.toastr.error(
            error.error.message || this.translationService.instant('course.fetchError')
          );
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchCourses();
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
    this.fetchCourses();
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchCourses();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterOrganizationId = null;
    this.filterCourseTabId = this.selectedCourseTabId; // Keep selected course tab
    this.filterStatus = 'all';
    this.filterStartDateFrom = '';
    this.filterStartDateTo = '';
    this.filterEndDateFrom = '';
    this.filterEndDateTo = '';
    this.filterLocationId = null;
    this.currentPage = 1;
    this.fetchCourses();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || 
             (this.filterOrganizationId && this.filterOrganizationId !== this.selectedCourseTabId) || 
             (this.filterCourseTabId && this.filterCourseTabId !== this.selectedCourseTabId) ||
             this.filterStatus !== 'all' ||
             this.filterStartDateFrom ||
             this.filterStartDateTo ||
             this.filterEndDateFrom ||
             this.filterEndDateTo ||
             this.filterLocationId);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusClass(status: CourseStatus): string {
    const statusClasses: { [key: number]: string } = {
      [CourseStatus.Draft]: 'bg-gray-100 text-gray-800',
      [CourseStatus.Published]: 'bg-green-100 text-green-800',
      [CourseStatus.RegistrationClosed]: 'bg-yellow-100 text-yellow-800',
      [CourseStatus.Active]: 'bg-blue-100 text-blue-800',
      [CourseStatus.Completed]: 'bg-purple-100 text-purple-800',
      [CourseStatus.Canceled]: 'bg-red-100 text-red-800',
      [CourseStatus.Archived]: 'bg-gray-100 text-gray-600',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: CourseStatus): string {
    const statusTexts: { [key: number]: string } = {
      [CourseStatus.Draft]: 'Draft',
      [CourseStatus.Published]: 'Published',
      [CourseStatus.RegistrationClosed]: 'Registration Closed',
      [CourseStatus.Active]: 'Active',
      [CourseStatus.Completed]: 'Completed',
      [CourseStatus.Canceled]: 'Canceled',
      [CourseStatus.Archived]: 'Archived',
    };
    return statusTexts[status] || 'Unknown';
  }

  viewCourseDetails(course: Course): void {
    if (this.isPublicView) {
      // In public view, navigate to public course preview
      const routeCode = this.route.snapshot.paramMap.get('routeCode');
      if (routeCode) {
        this.router.navigate(['/courses', routeCode, 'preview', course.id]);
      } else {
        this.router.navigate(['/courses', course.courseTab?.routeCode, 'preview', course.id]);
      }
    } else {
      this.router.navigate(['/management/courses/details', course.id]);
    }
  }

  enrollInCourse(course: Course): void {
    if (!course.id) return;
    
    this.loadingService.show();
    this.enrollmentService.enrollInCourse(course.id).subscribe({
      next: (response) => {
        this.toastr.success(this.translationService.instant('course.enrollSuccess'));
        this.loadingService.hide();
        // Optionally refresh courses to update enrollment status
        this.fetchCourses();
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.enrollError')
        );
        this.loadingService.hide();
      },
    });
  }

  publishCourse(course: Course): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'success',
        title: this.translationService.instant('course.publishCourse'),
        message: this.translationService.instant('course.publishConfirmation', { name: course.courseTitle }),
        confirmText: this.translationService.instant('course.publish'),
        cancelText: this.translationService.instant('common.cancel'),
      },
      width: '400px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result && course.id) {
        this.loadingService.show();
        // Update course status to Published
        const { id, createdAt, createdBy, updatedAt, updatedBy, ...courseData } = course;
        const updatedCourse = {
          ...courseData,
          status: CourseStatus.Published
        };
        this.courseService.updateCourse(course.id!, updatedCourse).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.publishSuccess'));
            this.loadingService.hide();
            this.fetchCourses();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.publishError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  addNewCourse(): void {
    const dialogRef = this.dialogService.open(CourseFormComponent, {
      data: { 
        courseTabs: this.courseTabs,
        organizations: this.organizations,
        defaultCourseTabId: this.selectedCourseTabId
      },
      width: '900px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'xl',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchCourses();
      }
    });
  }

  editCourse(course: Course): void {
    const dialogRef = this.dialogService.open(CourseFormComponent, {
      data: { 
        course,
        courseTabs: this.courseTabs,
        organizations: this.organizations
      },
      width: '900px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'xl',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchCourses();
      }
    });
  }

  deleteCourse(course: Course): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'danger',
        title: this.translationService.instant('course.deleteTitle'),
        message: this.translationService.instant('course.deleteMessage', { name: course.courseTitle }),
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
        this.courseService.deleteCourse(course.id!).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.deleteSuccess'));
            this.loadingService.hide();
            this.fetchCourses();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  toggleStatus(course: Course): void {
    const isActivating = !course.isActive;
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: isActivating ? 'success' : 'warning',
        title: isActivating
          ? this.translationService.instant('course.activateTitle')
          : this.translationService.instant('course.deactivateTitle'),
        message: isActivating
          ? this.translationService.instant('course.activateMessage', { name: course.courseTitle })
          : this.translationService.instant('course.deactivateMessage', { name: course.courseTitle }),
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
        this.courseService.toggleStatus(course.id!).subscribe({
          next: () => {
            this.toastr.success(
              this.translationService.instant(isActivating ? 'course.activateSuccess' : 'course.deactivateSuccess')
            );
            this.loadingService.hide();
            this.fetchCourses();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant(isActivating ? 'course.activateError' : 'course.deactivateError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  /**
   * Filter courses based on target user settings
   * DEPRECATED: This is now handled on the backend
   * Keeping for reference but not used anymore
   */
  filterCoursesByTargetUser_DEPRECATED(courses: Course[]): Course[] {
    const currentUser = this.storageService.getItem<any>('currentUser');
    if (!currentUser) {
      // If no user logged in, only show courses with no target user restrictions
      return courses.filter(course => !course.targetUserType);
    }

    const userOrganizationId = currentUser?.organizationId || currentUser?.organization?.id;
    const userDepartmentId = currentUser?.departmentId || currentUser?.department?.id;
    const userDepartmentRole = currentUser?.departmentRole;
    // User segments might be stored in different ways - check multiple possible locations
    let userSegmentIds: number[] = [];
    if (currentUser?.segmentIds && Array.isArray(currentUser.segmentIds)) {
      userSegmentIds = currentUser.segmentIds;
    } else if (currentUser?.segments && Array.isArray(currentUser.segments)) {
      userSegmentIds = currentUser.segments.map((s: any) => s.id || s);
    } else if (currentUser?.userSegments && Array.isArray(currentUser.userSegments)) {
      userSegmentIds = currentUser.userSegments.map((us: any) => us.segmentId || us.segment?.id);
    }

    return courses.filter(course => {
      // If course has no target user type, show it to everyone
      if (!course.targetUserType) {
        return true;
      }

      const targetType = typeof course.targetUserType === 'string' 
        ? parseInt(course.targetUserType, 10) 
        : course.targetUserType;

      switch (targetType) {
        case TargetUserType.ForOurOrganization:
          // Show if user's organization matches course's organization
          return userOrganizationId === course.organizationId;

        case TargetUserType.All:
          // Show to everyone
          return true;

        case TargetUserType.SpecificDepartments:
          // Show if user's department is in the list and role matches
          if (!course.targetDepartmentIds || course.targetDepartmentIds.length === 0) {
            return false;
          }
          // Convert department IDs to numbers for comparison
          const departmentIds = course.targetDepartmentIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
          const isInDepartment = departmentIds.includes(userDepartmentId);
          if (!isInDepartment) {
            return false;
          }
          // Check role if specified
          if (course.targetDepartmentRole) {
            if (course.targetDepartmentRole === 'Both') {
              return true; // Both Head and Member can see
            }
            return userDepartmentRole === course.targetDepartmentRole;
          }
          return true;

        case TargetUserType.SpecificOrganizations:
          // Show if user's organization is in the list
          if (!course.targetOrganizationIds || course.targetOrganizationIds.length === 0) {
            return false;
          }
          // Convert organization IDs to numbers for comparison
          const organizationIds = course.targetOrganizationIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
          return organizationIds.includes(userOrganizationId);

        case TargetUserType.SpecificSegments:
          // Show if user is in any of the selected segments
          if (!course.targetSegmentIds || course.targetSegmentIds.length === 0) {
            return false;
          }
          // Convert segment IDs to numbers for comparison
          const segmentIds = course.targetSegmentIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
          return segmentIds.some(segmentId => userSegmentIds.includes(segmentId));

        case TargetUserType.AllUsersOfOrganization:
          // Show if user's organization matches course's organization
          return userOrganizationId === course.organizationId;

        case TargetUserType.SpecificOrganizationSegment:
          // Show if user is in any of the selected segments
          if (!course.targetSegmentIds || course.targetSegmentIds.length === 0) {
            return false;
          }
          // Convert segment IDs to numbers for comparison
          const orgSegmentIds = course.targetSegmentIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
          return orgSegmentIds.some(segmentId => userSegmentIds.includes(segmentId));

        default:
          // Unknown target type, don't show
          return false;
      }
    });
  }

  getEnrollmentStatusBadgeClass(status: string | undefined): string {
    if (!status) return 'bg-yellow-500/90 text-white';
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-500/90 text-white';
      case 'rejected':
        return 'bg-red-500/90 text-white';
      case 'excused':
        return 'bg-yellow-500/90 text-white';
      case 'pending':
      default:
        return 'bg-yellow-500/90 text-white';
    }
  }

  getEnrollmentStatusText(status: string | undefined): string {
    if (!status) return this.translationService.instant('course.pending');
    switch (status.toLowerCase()) {
      case 'approved':
        return this.translationService.instant('course.approved');
      case 'rejected':
        return this.translationService.instant('course.rejected');
      case 'excused':
        return this.translationService.instant('course.excused');
      case 'pending':
      default:
        return this.translationService.instant('course.pending');
    }
  }
}
