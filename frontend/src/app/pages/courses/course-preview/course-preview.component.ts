import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService, Course, CourseStatus } from '../../../services/course.service';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { TranslationService } from '../../../services/translation.service';
import { EnrollmentService, CourseEnrollment, EnrollmentStatus } from '../../../services/enrollment.service';
import { AttachmentService } from '../../../services/attachment.service';

@Component({
  selector: 'app-course-preview',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LoadingComponent,
  ],
  templateUrl: './course-preview.component.html',
  styleUrl: './course-preview.component.scss',
})
export class CoursePreviewComponent implements OnInit {
  course: Course | null = null;
  isLoading = false;
  isCheckingEnrollment = false;
  isEnrolled = false;
  enrollment: CourseEnrollment | null = null;
  EnrollmentStatus = EnrollmentStatus;
  CourseStatus = CourseStatus;
  Math = Math;
  activeTab: 'overview' | 'instructor' = 'overview';
  currentLanguage: 'en' | 'ar' = 'en';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
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
      this.router.navigate(['/dashboard']);
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
        
        // Only check enrollment if course is published
        if (this.course?.status === CourseStatus.Published) {
          this.checkEnrollmentStatus();
        }
      },
      error: (error: any) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.loadError')
        );
        this.isLoading = false;
        this.loadingService.hide();
        this.router.navigate(['/dashboard']);
      },
    });
  }

  checkEnrollmentStatus(): void {
    if (!this.course?.id) return;
    
    this.isCheckingEnrollment = true;
    this.enrollmentService.checkEnrollment(this.course.id).subscribe({
      next: (response: any) => {
        this.enrollment = response.result;
        this.isEnrolled = !!response.result;
        this.isCheckingEnrollment = false;
      },
      error: (error: any) => {
        // If error, assume not enrolled
        this.isEnrolled = false;
        this.enrollment = null;
        this.isCheckingEnrollment = false;
      },
    });
  }

  excuseEnrollment(): void {
    if (!this.enrollment?.id) return;
    
    this.loadingService.show();
    this.enrollmentService.excuseEnrollment(this.enrollment.id).subscribe({
      next: (response: any) => {
        this.toastr.success(this.translationService.instant('course.excuseEnrollmentSuccess'));
        this.loadingService.hide();
        this.checkEnrollmentStatus(); // Refresh enrollment status
      },
      error: (error: any) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.excuseEnrollmentError')
        );
        this.loadingService.hide();
      },
    });
  }

  canExcuse(): boolean {
    if (!this.enrollment || !this.course) return false;
    
    // Can only excuse if approved
    if (this.enrollment.status !== EnrollmentStatus.Approve) return false;
    
    // Check if course has start date and courseTab has excuse time
    if (!this.course.startDateTime || !this.course.courseTab?.excuseTimeHours) return false;
    
    const courseStartTime = new Date(this.course.startDateTime);
    const excuseDeadline = new Date(courseStartTime.getTime() - (this.course.courseTab.excuseTimeHours * 60 * 60 * 1000));
    const currentTime = new Date();
    
    return currentTime < excuseDeadline;
  }

  enrollInCourse(): void {
    if (!this.course?.id) return;
    
    this.loadingService.show();
    this.enrollmentService.enrollInCourse(this.course.id).subscribe({
      next: (response: any) => {
        this.toastr.success(this.translationService.instant('course.enrollSuccess'));
        this.loadingService.hide();
        this.isEnrolled = true;
      },
      error: (error: any) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.enrollError')
        );
        this.loadingService.hide();
      },
    });
  }

  getLocationLogoUrl(logoPath: string | undefined): string {
    if (!logoPath) return '';
    return this.attachmentService.getFileUrl(logoPath);
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

  goBack(): void {
    const routeCode = this.route.snapshot.paramMap.get('routeCode');
    if (routeCode) {
      this.router.navigate(['/courses', routeCode]);
    } else {
      this.router.navigate(['/dashboard']);
    }
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

  getEnrollmentStatusBadgeClass(status: EnrollmentStatus | undefined): string {
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

  getEnrollmentStatusText(status: EnrollmentStatus | undefined): string {
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
}

