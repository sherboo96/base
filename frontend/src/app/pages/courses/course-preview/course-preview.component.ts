import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService, Course, CourseStatus, AdoptionType } from '../../../services/course.service';
import { CourseQuestionService, CourseQuestion, QuestionType } from '../../../services/course-question.service';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { TranslationService } from '../../../services/translation.service';
import { EnrollmentService, CourseEnrollment, EnrollmentStatus } from '../../../services/enrollment.service';
import { AttachmentService } from '../../../services/attachment.service';
import { AdoptionUserService, AdoptionUser } from '../../../services/adoption-user.service';
import { DialogService } from '@ngneat/dialog';
import { EnrollmentQuestionsDialogComponent } from '../enrollment-questions-dialog/enrollment-questions-dialog.component';

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
  activeTab: 'overview' | 'instructor' | 'adoptionUsers' | 'courseContacts' = 'overview';
  currentLanguage: 'en' | 'ar' = 'en';
  approvedEnrollmentsCount = 0;
  approvedOnlineEnrollmentsCount = 0;
  AdoptionType = AdoptionType;
  adoptionUsers: AdoptionUser[] = [];
  isUploadingLocationDocument = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private courseQuestionService: CourseQuestionService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private translationService: TranslationService,
    private enrollmentService: EnrollmentService,
    private attachmentService: AttachmentService,
    private adoptionUserService: AdoptionUserService,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef
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
        
        // Only check enrollment if course is published (normalized status)
        if (this.isCoursePublished()) {
          this.checkEnrollmentStatus();
          this.loadApprovedEnrollmentsCount();
        }
        
        // Load adoption users if course has adoption users
        if (this.course?.adoptionUsers && this.course.adoptionUsers.length > 0) {
          this.loadAdoptionUsers();
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

  /**
   * Reload the full course + enrollment view from the backend.
   * Ensures the "Enroll Now" card always reflects the latest server state.
   */
  private reloadView(): void {
    if (!this.course?.id) {
      return;
    }
    // Reload course and enrollment status
    this.loadCourse(this.course.id);
    // Also explicitly check enrollment status to ensure UI updates
    setTimeout(() => {
      this.checkEnrollmentStatus();
      this.loadApprovedEnrollmentsCount();
      this.cdr.detectChanges();
    }, 500);
  }

  checkEnrollmentStatus(): void {
    if (!this.course?.id) return;
    
    this.isCheckingEnrollment = true;
    this.enrollmentService.checkEnrollment(this.course.id).subscribe({
      next: (response: any) => {
        this.enrollment = response.result;
        this.isEnrolled = !!response.result;
        this.isCheckingEnrollment = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        // If error, assume not enrolled
        this.isEnrolled = false;
        this.enrollment = null;
        this.isCheckingEnrollment = false;
        this.cdr.detectChanges();
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
        // Reload full view so available seats and enrollment card are updated
        this.reloadView();
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

  loadApprovedEnrollmentsCount(): void {
    if (!this.course?.id) return;
    
    this.enrollmentService.getEnrollmentsByCourse(this.course.id, 1, 1000).subscribe({
      next: (response: any) => {
        let result: CourseEnrollment[] = [];
        if (response && typeof response === 'object') {
          result = response.result || response.Result || [];
        }
        // Count approved onsite enrollments (enrollmentType === 1 or null)
        this.approvedEnrollmentsCount = result.filter((e: CourseEnrollment) => 
          e.status === EnrollmentStatus.Approve && 
          (e.enrollmentType === 1 || e.enrollmentType === null)
        ).length;
        // Count approved online enrollments (enrollmentType === 2)
        this.approvedOnlineEnrollmentsCount = result.filter((e: CourseEnrollment) => 
          e.status === EnrollmentStatus.Approve && 
          e.enrollmentType === 2
        ).length;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        // Silently fail for seats calculation
        console.error('Error loading enrollments for seats:', error);
      }
    });
  }

  getAvailableSeats(): number {
    if (!this.course) return 0;
    // Use API values if available, otherwise fall back to calculation
    if (this.course.onsiteEnrollmentsCount !== undefined) {
      return Math.max(0, (this.course.availableSeats || 0) - (this.course.onsiteEnrollmentsCount || 0));
    }
    // Fallback to old calculation method
    const totalSeats = this.course.availableSeats || 0;
    return Math.max(0, totalSeats - this.approvedEnrollmentsCount);
  }

  getAvailableOnlineSeats(): number {
    if (!this.course) return 0;
    // Use API values if available, otherwise fall back to calculation
    if (this.course.onlineEnrollmentsCount !== undefined) {
      return Math.max(0, (this.course.availableOnlineSeats || 0) - (this.course.onlineEnrollmentsCount || 0));
    }
    // Fallback to old calculation method
    const totalOnlineSeats = this.course.availableOnlineSeats || 0;
    return Math.max(0, totalOnlineSeats - this.approvedOnlineEnrollmentsCount);
  }

  enrollInCourse(): void {
    if (!this.course?.id) return;
    
    // Check available seats before enrolling
    const availableSeats = this.getAvailableSeats();
    if (availableSeats < 1) {
      this.toastr.error(this.translationService.instant('course.noSeatsAvailable'));
      return;
    }

    // Step 1: Load enrollment questions for this course
    this.loadingService.show();
    this.courseQuestionService.getByCourseId(this.course.id).subscribe({
      next: (response) => {
        this.loadingService.hide();

        let questions: CourseQuestion[] = [];
        if (response.statusCode === 200 && response.result) {
          questions = Array.isArray(response.result) ? response.result : [response.result];
        }

        // If there are questions, show the dialog for the user to answer them
        if (questions.length > 0) {
          const dialogRef = this.dialogService.open(EnrollmentQuestionsDialogComponent, {
            data: { questions },
            width: '700px',
            maxHeight: '90vh',
            enableClose: true,
            closeButton: true,
            resizable: false,
            draggable: true,
          });

          dialogRef.afterClosed$.subscribe((answers: { [key: string]: string } | null) => {
            if (answers) {
              this.performEnrollment(answers);
            }
          });
        } else {
          // No questions – proceed with normal enrollment
          this.performEnrollment();
        }
      },
      error: (error) => {
        this.loadingService.hide();
        console.error('Error loading enrollment questions:', error);
        // If questions fail to load, still allow enrollment but notify user
        this.toastr.warning(this.translationService.instant('course.loadQuestionsError'));
        this.performEnrollment();
      }
    });
  }

  /**
   * Perform the actual enrollment call, optionally including question answers.
   */
  private performEnrollment(questionAnswers?: { [key: string]: string }): void {
    if (!this.course?.id) return;
    
    this.loadingService.show();
    this.enrollmentService.enrollInCourse(this.course.id, questionAnswers).subscribe({
      next: (response: any) => {
        this.toastr.success(this.translationService.instant('course.enrollSuccess'));
        this.loadingService.hide();
        // Update enrollment status immediately
        this.isEnrolled = true;
        if (response.result) {
          this.enrollment = response.result;
        }
        // Always reload from backend so the Enroll Now view reflects latest state
        this.reloadView();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.enrollError')
        );
        this.loadingService.hide();
        this.cdr.detectChanges();
      },
    });
  }

  getLocationLogoUrl(logoPath: string | undefined): string {
    if (!logoPath) return '';
    return this.attachmentService.getFileUrl(logoPath);
  }

  getLocationTemplateUrl(): string {
    if (!this.course?.location?.template) return '';
    return this.attachmentService.getFileUrl(this.course.location.template);
  }

  hasLocationDocumentation(): boolean {
    return !!this.course?.location && (!!this.course.location.template || !!this.course.location.url);
  }

  onLocationDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.enrollment) {
      return;
    }

    const file = input.files[0];
    this.isUploadingLocationDocument = true;
    this.loadingService.show();

    this.attachmentService.uploadFile(file).subscribe({
      next: (filePath: string) => {
        // After uploading the file, associate it with the enrollment so it appears in enrollments view
        this.enrollmentService.updateLocationDocument(this.enrollment!.id, filePath).subscribe({
          next: () => {
        this.isUploadingLocationDocument = false;
        this.loadingService.hide();
        this.toastr.success(this.translationService.instant('course.locationDocumentUploadSuccess'));
            // Reload enrollment status so local state is in sync
            this.checkEnrollmentStatus();
            input.value = '';
          },
          error: () => {
            this.isUploadingLocationDocument = false;
            this.loadingService.hide();
            this.toastr.error(this.translationService.instant('course.locationDocumentUploadError'));
        input.value = '';
          }
        });
      },
      error: () => {
        this.isUploadingLocationDocument = false;
        this.loadingService.hide();
        this.toastr.error(this.translationService.instant('course.locationDocumentUploadError'));
        input.value = '';
      }
    });
  }

  /**
   * Normalize course status from API (string or number) to CourseStatus enum.
   */
  private normalizeCourseStatus(value: any): CourseStatus | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return value as CourseStatus;
    }

    const str = String(value).trim();

    // Try enum key name (e.g., "Published", "Active")
    if (CourseStatus[str as keyof typeof CourseStatus] !== undefined) {
      return CourseStatus[str as keyof typeof CourseStatus] as CourseStatus;
    }

    const num = Number(str);
    return isNaN(num) ? null : (num as CourseStatus);
  }

  /**
   * Helper to check if course is published (using normalized status).
   */
  isCoursePublished(): boolean {
    if (!this.course) return false;
    const status = this.normalizeCourseStatus((this.course as any).status);
    return status === CourseStatus.Published;
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

  getStatusClass(status: CourseStatus | any): string {
    const normalized = this.normalizeCourseStatus(status);
    if (normalized === null) {
      return 'bg-gray-100 text-gray-800';
    }
    const statusClasses: { [key: number]: string } = {
      [CourseStatus.Draft]: 'bg-gray-100 text-gray-800',
      [CourseStatus.Published]: 'bg-green-100 text-green-800',
      [CourseStatus.RegistrationClosed]: 'bg-yellow-100 text-yellow-800',
      [CourseStatus.Active]: 'bg-blue-100 text-blue-800',
      [CourseStatus.Completed]: 'bg-purple-100 text-purple-800',
      [CourseStatus.Canceled]: 'bg-red-100 text-red-800',
      [CourseStatus.Archived]: 'bg-gray-100 text-gray-600',
    };
    return statusClasses[normalized] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: CourseStatus | any): string {
    const normalized = this.normalizeCourseStatus(status);
    if (normalized === null) {
      return this.translationService.instant('course.unknownStatus') || 'Unknown';
    }
    const statusTexts: { [key: number]: string } = {
      [CourseStatus.Draft]: 'Draft',
      [CourseStatus.Published]: 'Published',
      [CourseStatus.RegistrationClosed]: 'Registration Closed',
      [CourseStatus.Active]: 'Active',
      [CourseStatus.Completed]: 'Completed',
      [CourseStatus.Canceled]: 'Canceled',
      [CourseStatus.Archived]: 'Archived',
    };
    return statusTexts[normalized] || this.translationService.instant('course.unknownStatus') || 'Unknown';
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

  loadAdoptionUsers(): void {
    if (!this.course?.id || !this.course?.adoptionUsers) {
      this.adoptionUsers = [];
      return;
    }
    const adoptionUserIds = this.course.adoptionUsers.map(au => au.adoptionUserId);
    this.adoptionUserService.getAdoptionUsers(1, 1000).subscribe({
      next: (response: any) => {
        this.adoptionUsers = (response.result || []).filter((au: any) => adoptionUserIds.includes(au.id));
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading adoption users:', error);
        this.adoptionUsers = [];
      },
    });
  }

  getAdoptionTypeLabel(type: AdoptionType): string {
    switch (type) {
      case AdoptionType.GatePass:
        return this.translationService.instant('course.adoptionTypeGatePass');
      case AdoptionType.OnlineMeeting:
        return this.translationService.instant('course.adoptionTypeOnlineMeeting');
      case AdoptionType.Other:
        return this.translationService.instant('course.adoptionTypeOther');
      default:
        return '';
    }
  }

  switchTab(tab: 'overview' | 'instructor' | 'adoptionUsers' | 'courseContacts'): void {
    this.activeTab = tab;
    if (tab === 'adoptionUsers' && this.adoptionUsers.length === 0 && this.course?.adoptionUsers) {
      this.loadAdoptionUsers();
    }
  }

  getAdoptionUserName(adoptionUser: any): string {
    if (adoptionUser.adoptionUser?.name) {
      return adoptionUser.adoptionUser.name;
    }
    const found = this.adoptionUsers.find(au => au.id === adoptionUser.adoptionUserId);
    return found?.name || '-';
  }

  getAdoptionUserEmail(adoptionUser: any): string {
    if (adoptionUser.adoptionUser?.email) {
      return adoptionUser.adoptionUser.email;
    }
    const found = this.adoptionUsers.find(au => au.id === adoptionUser.adoptionUserId);
    return found?.email || '';
  }

  getAdoptionUserInitial(adoptionUser: any): string {
    const name = this.getAdoptionUserName(adoptionUser);
    return name !== '-' ? name.charAt(0) : 'A';
  }
}

