import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService, Course, CourseStatus } from '../../../../services/course.service';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { LoadingComponent } from '../../../../components/loading/loading.component';
import { DialogService } from '@ngneat/dialog';
import { CourseFormComponent } from '../course-form/course-form.component';
import { DeleteConfirmationDialogComponent } from '../../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../../services/translation.service';
import { EnrollmentService, CourseEnrollment, EnrollmentStatus } from '../../../../services/enrollment.service';
import { AttachmentService } from '../../../../services/attachment.service';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LoadingComponent,
  ],
  templateUrl: './course-details.component.html',
  styleUrl: './course-details.component.scss',
})
export class CourseDetailsComponent implements OnInit {
  course: Course | null = null;
  isLoading = false;
  CourseStatus = CourseStatus;
  activeTab: 'overview' | 'instructor' | 'enrollments' = 'overview';
  enrollments: CourseEnrollment[] = [];
  isLoadingEnrollments = false;
  enrollmentPage = 1;
  enrollmentPageSize = 20;
  totalEnrollments = 0;
  Math = Math;
  currentLanguage: 'en' | 'ar' = 'en';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private dialogService: DialogService,
    private translationService: TranslationService,
    private enrollmentService: EnrollmentService,
    private attachmentService: AttachmentService
  ) {
    // Get current language
    this.currentLanguage = this.translationService.getCurrentLanguage() as 'en' | 'ar';
    // Subscribe to language changes
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLanguage = lang as 'en' | 'ar';
    });
  }

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loadCourse(+courseId);
    } else {
      this.toastr.error(this.translationService.instant('course.courseNotFound'));
      this.router.navigate(['/management/courses']);
    }
  }

  loadCourse(id: number): void {
    this.isLoading = true;
    this.loadingService.show();
    this.courseService.getCourse(id).subscribe({
      next: (response: any) => {
        this.course = response.result;
        this.isLoading = false;
        this.loadingService.hide();
        // Load enrollments if on enrollments tab
        if (this.activeTab === 'enrollments') {
          this.loadEnrollments();
        }
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.loadError')
        );
        this.isLoading = false;
        this.loadingService.hide();
        this.router.navigate(['/management/courses']);
      },
    });
  }

  loadEnrollments(): void {
    if (!this.course?.id) return;
    
    this.isLoadingEnrollments = true;
    this.enrollmentService.getEnrollmentsByCourse(this.course.id, this.enrollmentPage, this.enrollmentPageSize).subscribe({
      next: (response) => {
        this.enrollments = response.result;
        this.totalEnrollments = response.total;
        this.isLoadingEnrollments = false;
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.loadEnrollmentsError')
        );
        this.isLoadingEnrollments = false;
      },
    });
  }

  switchTab(tab: 'overview' | 'instructor' | 'enrollments'): void {
    this.activeTab = tab;
    if (tab === 'enrollments' && this.enrollments.length === 0) {
      this.loadEnrollments();
    }
  }

  formatEnrollmentDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  cancelEnrollment(enrollment: CourseEnrollment): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('course.cancelEnrollment'),
        message: this.translationService.instant('course.cancelEnrollmentConfirmation', {
          name: enrollment.user?.fullName || 'User',
        }),
      },
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        this.enrollmentService.cancelEnrollment(enrollment.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.cancelEnrollmentSuccess'));
            this.loadEnrollments();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.cancelEnrollmentError')
            );
          },
        });
      }
    });
  }

  approveEnrollment(enrollment: CourseEnrollment): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'success',
        title: this.translationService.instant('course.approveEnrollment'),
        message: this.translationService.instant('course.approveEnrollmentConfirmation', {
          name: enrollment.user?.fullName || 'User',
        }),
        confirmText: this.translationService.instant('course.approve'),
        cancelText: this.translationService.instant('common.cancel'),
      },
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        this.loadingService.show();
        this.enrollmentService.approveEnrollment(enrollment.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.approveEnrollmentSuccess'));
            this.loadingService.hide();
            this.loadEnrollments();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.approveEnrollmentError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  rejectEnrollment(enrollment: CourseEnrollment): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'warning',
        title: this.translationService.instant('course.rejectEnrollment'),
        message: this.translationService.instant('course.rejectEnrollmentConfirmation', {
          name: enrollment.user?.fullName || 'User',
        }),
        confirmText: this.translationService.instant('course.reject'),
        cancelText: this.translationService.instant('common.cancel'),
      },
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        this.loadingService.show();
        this.enrollmentService.rejectEnrollment(enrollment.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.rejectEnrollmentSuccess'));
            this.loadingService.hide();
            this.loadEnrollments();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.rejectEnrollmentError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  getEnrollmentStatusClass(status?: EnrollmentStatus): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case EnrollmentStatus.Approve:
        return 'bg-green-100 text-green-800';
      case EnrollmentStatus.Reject:
        return 'bg-red-100 text-red-800';
      case EnrollmentStatus.Excuse:
        return 'bg-yellow-100 text-yellow-800';
      case EnrollmentStatus.Pending:
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getEnrollmentStatusText(status?: EnrollmentStatus): string {
    if (!status) return this.translationService.instant('course.pending');
    switch (status) {
      case EnrollmentStatus.Approve:
        return this.translationService.instant('course.approved');
      case EnrollmentStatus.Reject:
        return this.translationService.instant('course.rejected');
      case EnrollmentStatus.Excuse:
        return this.translationService.instant('course.excused');
      case EnrollmentStatus.Pending:
      default:
        return this.translationService.instant('course.pending');
    }
  }

  goToFirstPage(): void {
    this.enrollmentPage = 1;
    this.loadEnrollments();
  }

  goToPreviousPage(): void {
    if (this.enrollmentPage > 1) {
      this.enrollmentPage--;
      this.loadEnrollments();
    }
  }

  goToNextPage(): void {
    const totalPages = Math.ceil(this.totalEnrollments / this.enrollmentPageSize);
    if (this.enrollmentPage < totalPages) {
      this.enrollmentPage++;
      this.loadEnrollments();
    }
  }

  goToLastPage(): void {
    const totalPages = Math.ceil(this.totalEnrollments / this.enrollmentPageSize);
    this.enrollmentPage = totalPages;
    this.loadEnrollments();
  }

  canGoToPreviousPage(): boolean {
    return this.enrollmentPage > 1;
  }

  canGoToNextPage(): boolean {
    return this.enrollmentPage < Math.ceil(this.totalEnrollments / this.enrollmentPageSize);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
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

  editCourse(): void {
    if (!this.course) return;
    
    const dialogRef = this.dialogService.open(CourseFormComponent, {
      data: { course: this.course },
      width: '900px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'xl',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result && this.course) {
        this.loadCourse(this.course.id!);
      }
    });
  }

  deleteCourse(): void {
    if (!this.course) return;

    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('course.deleteCourse'),
        message: this.translationService.instant('course.deleteConfirmation', {
          name: this.course.courseTitle,
        }),
      },
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed && this.course) {
        this.courseService.deleteCourse(this.course.id!).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.deleteSuccess'));
            this.router.navigate(['/management/courses']);
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.deleteError')
            );
          },
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/management/courses']);
  }

  getCourseDuration(): string {
    if (!this.course?.startDateTime || !this.course?.endDateTime) {
      return '-';
    }
    const start = new Date(this.course.startDateTime);
    const end = new Date(this.course.endDateTime);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 Day' : `${diffDays} Days`;
  }

  getCourseTime(): string {
    if (!this.course?.startDateTime || !this.course?.endDateTime) {
      return '-';
    }
    const start = new Date(this.course.startDateTime);
    const end = new Date(this.course.endDateTime);
    const startTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const endTime = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${startTime} - ${endTime}`;
  }

  getInstructorImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    return this.attachmentService.getFileUrl(imagePath);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const fallback = img.nextElementSibling as HTMLElement;
      if (fallback) {
        fallback.style.display = 'flex';
      }
    }
  }
}

