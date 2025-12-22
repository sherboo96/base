import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService, Course, CourseStatus, AdoptionType } from '../../../../services/course.service';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { DialogService } from '@ngneat/dialog';
import { CourseFormComponent } from '../course-form/course-form.component';
import { DeleteConfirmationDialogComponent } from '../../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../../services/translation.service';
import { CourseAdoptionUserFormComponent } from '../course-adoption-user-form/course-adoption-user-form.component';
import { CourseContactFormComponent } from '../course-contact-form/course-contact-form.component';
import { EnrollmentService, CourseEnrollment, EnrollmentStatus } from '../../../../services/enrollment.service';
import { AttendanceService } from '../../../../services/attendance.service';
import { AttachmentService } from '../../../../services/attachment.service';
import { AdoptionUserService, AdoptionUser } from '../../../../services/adoption-user.service';
import { ApprovalStepsDialogComponent } from '../../../../components/approval-steps-dialog/approval-steps-dialog.component';
import { CourseAttendanceComponent } from '../course-attendance/course-attendance.component';
import { CourseManualEnrollmentComponent } from '../course-manual-enrollment/course-manual-enrollment.component';

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,

    CourseAttendanceComponent
  ],
  templateUrl: './course-details.component.html',
  styleUrl: './course-details.component.scss',
})
export class CourseDetailsComponent implements OnInit {
  course: Course | null = null;
  isLoading = false;
  CourseStatus = CourseStatus;
  activeTab: 'overview' | 'instructor' | 'enrollments' | 'adoptionUsers' | 'courseContacts' | 'attendance' = 'overview';
  enrollments: CourseEnrollment[] = [];
  groupedEnrollments: { [key: string]: CourseEnrollment[] } = {};
  enrollmentOrganizations: string[] = [];
  isLoadingEnrollments = false;
  enrollmentPage = 1;
  enrollmentPageSize = 20;
  totalEnrollments = 0;
  approvedEnrollmentsCount = 0;
  Math = Math;
  currentLanguage: 'en' | 'ar' = 'en';
  AdoptionType = AdoptionType;
  adoptionUsers: AdoptionUser[] = [];
  groupedAdoptionUsers: { [key: string]: any[] } = {};
  adoptionUserOrganizations: string[] = [];
  showStatusDropdown = false;
  attendanceRecords: { [enrollmentId: number]: { hasCheckIn: boolean; hasCheckOut: boolean } } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private dialogService: DialogService,
    private translationService: TranslationService,
    private enrollmentService: EnrollmentService,
    private attachmentService: AttachmentService,
    private adoptionUserService: AdoptionUserService,
    private attendanceService: AttendanceService,
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
        // Always load enrollments to calculate available seats
        this.loadEnrollmentsForSeats();
        // Load full enrollments if on enrollments tab
        if (this.activeTab === 'enrollments') {
          this.loadEnrollments();
        }
        // Load adoption users if on adoptionUsers tab
        if (this.activeTab === 'adoptionUsers') {
          this.loadAdoptionUsers();
        } else if (this.course?.adoptionUsers && this.course.adoptionUsers.length > 0) {
          // Pre-load adoption users data for grouping even if not on the tab
          this.loadAdoptionUsers();
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
    if (!this.course?.id) {
      this.isLoadingEnrollments = false;
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingEnrollments = true;
    this.cdr.detectChanges();

    this.enrollmentService.getEnrollmentsByCourse(this.course.id, this.enrollmentPage, this.enrollmentPageSize).subscribe({
      next: (response: any) => {
        // Debug: Log the full response to see its structure
        console.log('Enrollments API Response:', response);
        console.log('Response type:', typeof response);
        console.log('Response keys:', response ? Object.keys(response) : 'null/undefined');

        // The response should be a BaseResponse with camelCase properties
        // Handle both camelCase (default) and PascalCase (fallback) response properties
        let result: any[] = [];
        let total: number = 0;

        // Try camelCase first (default ASP.NET Core JSON serialization)
        if (response && typeof response === 'object') {
          result = response.result || response.Result || [];
          total = response.total ?? response.Total ?? 0;
        }

        // Ensure result is an array
        this.enrollments = Array.isArray(result) ? result : [];
        this.totalEnrollments = typeof total === 'number' ? total : 0;
        // Count approved enrollments
        this.approvedEnrollmentsCount = this.enrollments.filter(e => this.normalizeEnrollmentStatus(e.status) === EnrollmentStatus.Approve).length;
        
        // Load attendance records to check check-in status
        this.loadAttendanceForEnrollments();

        // Group enrollments by organization and sort by enrollment date
        this.groupEnrollmentsByOrganization();

        console.log('Parsed enrollments:', this.enrollments);
        console.log('Total enrollments:', this.totalEnrollments);
        console.log('isLoadingEnrollments set to:', this.isLoadingEnrollments);

        // Force change detection
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading enrollments:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error body:', error.error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.loadEnrollmentsError')
        );
        this.enrollments = [];
        this.totalEnrollments = 0;
        this.isLoadingEnrollments = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        console.log('Enrollments subscription completed');
        // Ensure loading is false even if something went wrong
        if (this.isLoadingEnrollments) {
          console.warn('isLoadingEnrollments was still true on complete, setting to false');
          this.isLoadingEnrollments = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  loadAttendanceForEnrollments(): void {
    if (!this.course?.id) return;

    // Load attendance records to check which enrollments have check-in/check-out
    this.attendanceService.getAttendanceByCourse(this.course.id).subscribe({
      next: (response: any) => {
        const data = response?.result || response?.Result || response || [];
        const attendances = Array.isArray(data) ? data : [];
        
        // Reset attendance records
        this.attendanceRecords = {};
        
        // Group attendance records by enrollment ID and find the most recent one
        const enrollmentAttendanceMap: { [enrollmentId: number]: any[] } = {};
        
        attendances.forEach((attendance: any) => {
          const enrollmentId = attendance.courseEnrollmentId;
          if (!enrollmentAttendanceMap[enrollmentId]) {
            enrollmentAttendanceMap[enrollmentId] = [];
          }
          enrollmentAttendanceMap[enrollmentId].push(attendance);
        });
        
        // For each enrollment, check the most recent attendance record
        Object.keys(enrollmentAttendanceMap).forEach(enrollmentIdStr => {
          const enrollmentId = parseInt(enrollmentIdStr, 10);
          const records = enrollmentAttendanceMap[enrollmentId];
          
          // Sort by check-in time (most recent first)
          records.sort((a, b) => {
            const timeA = new Date(a.checkInTime).getTime();
            const timeB = new Date(b.checkInTime).getTime();
            return timeB - timeA;
          });
          
          // Get the most recent record
          const mostRecent = records[0];
          
          if (mostRecent) {
            this.attendanceRecords[enrollmentId] = {
              hasCheckIn: !!mostRecent.checkInTime,
              hasCheckOut: !!mostRecent.checkOutTime
            };
          }
        });
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Silently fail - attendance check is optional
        console.error('Error loading attendance records:', error);
      }
    });
  }

  switchTab(tab: 'overview' | 'instructor' | 'enrollments' | 'adoptionUsers' | 'courseContacts' | 'attendance'): void {
    this.activeTab = tab;
    if (tab === 'enrollments' && this.enrollments.length === 0) {
      this.loadEnrollments();
    } else if (tab === 'adoptionUsers') {
      this.loadAdoptionUsers();
    }
  }

  loadEnrollmentsForSeats(): void {
    if (!this.course?.id) return;

    this.enrollmentService.getEnrollmentsByCourse(this.course.id, 1, 1000).subscribe({
      next: (response: any) => {
        let result: CourseEnrollment[] = [];
        if (response && typeof response === 'object') {
          result = response.result || response.Result || [];
        }
        this.approvedEnrollmentsCount = result.filter((e: CourseEnrollment) => this.normalizeEnrollmentStatus(e.status) === EnrollmentStatus.Approve).length;
        this.cdr.detectChanges();
      },
      error: (error) => {
        // Silently fail for seats calculation
        console.error('Error loading enrollments for seats:', error);
      }
    });
  }

  getAvailableSeats(): number {
    if (!this.course) return 0;
    const totalSeats = this.course.availableSeats || 0;
    return Math.max(0, totalSeats - this.approvedEnrollmentsCount);
  }

  loadAdoptionUsers(): void {
    if (!this.course?.id || !this.course?.adoptionUsers) {
      this.adoptionUsers = [];
      this.groupedAdoptionUsers = {};
      this.adoptionUserOrganizations = [];
      return;
    }
    // Get adoption user IDs from course
    const adoptionUserIds = this.course.adoptionUsers.map(au => au.adoptionUserId);
    if (adoptionUserIds.length === 0) {
      this.adoptionUsers = [];
      this.groupedAdoptionUsers = {};
      this.adoptionUserOrganizations = [];
      return;
    }
    // Load adoption users by IDs
    this.adoptionUserService.getAdoptionUsers(1, 1000).subscribe({
      next: (response) => {
        this.adoptionUsers = (response.result || []).filter(au => adoptionUserIds.includes(au.id));
        // Group adoption users by organization
        this.groupAdoptionUsersByOrganization();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading adoption users:', error);
        this.adoptionUsers = [];
        this.groupedAdoptionUsers = {};
        this.adoptionUserOrganizations = [];
      },
    });
  }

  groupAdoptionUsersByOrganization(): void {
    const grouped: { [key: string]: any[] } = {};

    // Map course adoption users with their full adoption user data
    this.course?.adoptionUsers?.forEach(courseAdoptionUser => {
      const adoptionUser = this.adoptionUsers.find(au => au.id === courseAdoptionUser.adoptionUserId);
      if (adoptionUser) {
        const orgName = adoptionUser.organization?.name || 'Unknown Organization';
        if (!grouped[orgName]) {
          grouped[orgName] = [];
        }
        grouped[orgName].push({
          ...courseAdoptionUser,
          adoptionUser: adoptionUser
        });
      }
    });

    this.groupedAdoptionUsers = grouped;
    this.adoptionUserOrganizations = Object.keys(grouped).sort();
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

  addAdoptionUser(): void {
    if (!this.course?.id) return;

    // Create a simple form dialog for adding adoption user
    const dialogRef = this.dialogService.open(CourseAdoptionUserFormComponent, {
      data: {
        courseId: this.course.id,
        course: this.course,
        adoptionUsers: this.adoptionUsers,
      },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result && this.course?.id) {
        this.loadCourse(this.course.id);
      }
    });
  }

  editAdoptionUser(adoptionUser: any): void {
    if (!this.course?.id) return;

    const dialogRef = this.dialogService.open(CourseAdoptionUserFormComponent, {
      data: {
        courseId: this.course.id,
        course: this.course,
        adoptionUser: adoptionUser,
        adoptionUsers: this.adoptionUsers,
        isEdit: true,
      },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result && this.course?.id) {
        this.loadCourse(this.course.id);
      }
    });
  }

  deleteAdoptionUser(adoptionUser: any): void {
    if (!this.course?.id) return;

    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('course.deleteAdoptionUser'),
        message: this.translationService.instant('course.deleteAdoptionUserConfirmation', {
          name: adoptionUser.adoptionUser?.name || 'Adoption User',
        }),
      },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        if (!this.course?.id) return;
        this.loadingService.show();
        // Remove adoption user from course
        const updatedAdoptionUsers = (this.course.adoptionUsers || []).filter(
          (au: any) => au.adoptionUserId !== adoptionUser.adoptionUserId
        );

        const courseUpdate: any = {
          ...this.course,
          adoptionUsers: updatedAdoptionUsers,
        };
        this.courseService.updateCourse(this.course.id, courseUpdate).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.deleteAdoptionUserSuccess'));
            this.loadingService.hide();
            if (this.course?.id) {
              this.loadCourse(this.course.id);
            }
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.deleteAdoptionUserError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  addCourseContact(): void {
    if (!this.course?.id) return;

    const dialogRef = this.dialogService.open(CourseContactFormComponent, {
      data: {
        courseId: this.course.id,
        course: this.course,
      },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result && this.course?.id) {
        this.loadCourse(this.course.id);
      }
    });
  }

  editCourseContact(contact: any): void {
    if (!this.course?.id) return;

    const dialogRef = this.dialogService.open(CourseContactFormComponent, {
      data: {
        courseId: this.course.id,
        course: this.course,
        contact: contact,
        isEdit: true,
      },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result && this.course?.id) {
        this.loadCourse(this.course.id);
      }
    });
  }

  deleteCourseContact(contact: any): void {
    if (!this.course?.id) return;

    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('course.deleteCourseContact'),
        message: this.translationService.instant('course.deleteCourseContactConfirmation', {
          name: contact.name || 'Contact',
        }),
      },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        if (!this.course?.id) return;
        this.loadingService.show();
        // Remove contact from course
        const updatedContacts = (this.course.courseContacts || []).filter(
          (c: any) => c.id !== contact.id
        );

        const courseUpdate: any = {
          ...this.course,
          courseContacts: updatedContacts,
        };
        this.courseService.updateCourse(this.course.id, courseUpdate).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.deleteCourseContactSuccess'));
            this.loadingService.hide();
            if (this.course?.id) {
              this.loadCourse(this.course.id);
            }
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.deleteCourseContactError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  formatEnrollmentDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = (hours % 12 || 12).toString().padStart(2, '0');
    return `${day} - ${month} - ${year} at ${displayHours}:${minutes} ${ampm}`;
  }

  groupEnrollmentsByOrganization(): void {
    const grouped: { [key: string]: CourseEnrollment[] } = {};

    // Sort enrollments by enrollment date (newest first)
    const sortedEnrollments = [...this.enrollments].sort((a, b) => {
      const dateA = new Date(a.enrollmentAt).getTime();
      const dateB = new Date(b.enrollmentAt).getTime();
      return dateB - dateA; // Descending order
    });

    sortedEnrollments.forEach(enrollment => {
      const orgName = enrollment.user?.organizationName || 'Unknown Organization';
      if (!grouped[orgName]) {
        grouped[orgName] = [];
      }
      grouped[orgName].push(enrollment);
    });

    this.groupedEnrollments = grouped;
    this.enrollmentOrganizations = Object.keys(grouped).sort();
  }

  deleteEnrollment(enrollment: CourseEnrollment): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('course.deleteEnrollment'),
        message: this.translationService.instant('course.deleteEnrollmentConfirmation', {
          name: enrollment.user?.fullName || 'User',
        }),
      },
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        this.loadingService.show();
        this.enrollmentService.cancelEnrollment(enrollment.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.deleteEnrollmentSuccess'));
            this.loadingService.hide();
            this.loadEnrollments();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.deleteEnrollmentError')
            );
            this.loadingService.hide();
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

  canApproveStep(enrollment: CourseEnrollment, step: any): boolean {
    if (!enrollment.approvalSteps || enrollment.approvalSteps.length === 0) {
      return true;
    }

    // Get ALL approval steps from the backend (including Head Approval which is hidden in UI)
    // We need to check against ALL steps, not just the displayed ones
    const currentOrder = step.courseTabApproval?.approvalOrder || 0;

    // Check if there are any previous steps (by approval order) that are not approved
    // This includes Head Approval steps even though they're not displayed in this view
    const hasPendingPreviousSteps = enrollment.approvalSteps.some(s => {
      const stepOrder = s.courseTabApproval?.approvalOrder || 0;
      return stepOrder < currentOrder && !s.isApproved;
    });

    return !hasPendingPreviousSteps;
  }

  approveEnrollmentStep(enrollment: CourseEnrollment, step: any): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'success',
        title: this.translationService.instant('course.approveStep'),
        message: this.translationService.instant('course.approveStepConfirmation', {
          step: step.courseTabApproval?.approvalOrder || 1,
          name: enrollment.user?.fullName || 'User',
        }),
        confirmText: this.translationService.instant('course.approve'),
        cancelText: this.translationService.instant('common.cancel'),
      },
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        this.loadingService.show();
        this.enrollmentService.approveEnrollmentStep(enrollment.id, step.courseTabApprovalId).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.approveStepSuccess'));
            this.loadingService.hide();
            this.loadEnrollments();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.approveStepError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  rejectEnrollmentStep(enrollment: CourseEnrollment, step: any): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'warning',
        title: this.translationService.instant('course.rejectStep'),
        message: this.translationService.instant('course.rejectStepConfirmation', {
          step: step.courseTabApproval?.approvalOrder || 1,
          name: enrollment.user?.fullName || 'User',
        }),
        confirmText: this.translationService.instant('course.reject'),
        cancelText: this.translationService.instant('common.cancel'),
      },
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        this.loadingService.show();
        this.enrollmentService.rejectEnrollmentStep(enrollment.id, step.courseTabApprovalId).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('course.rejectStepSuccess'));
            this.loadingService.hide();
            this.loadEnrollments();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.rejectStepError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  viewApprovalSteps(enrollment: CourseEnrollment): void {
    const dialogRef = this.dialogService.open(ApprovalStepsDialogComponent, {
      data: {
        enrollment: enrollment,
        approvalSteps: enrollment.approvalSteps || [],
        canApproveStep: (step: any) => this.canApproveStep(enrollment, step)
      },
      width: '700px',
      enableClose: true,
      closeButton: false,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result: any) => {
      if (result?.action === 'approve') {
        this.approveEnrollmentStep(enrollment, result.step);
      } else if (result?.action === 'reject') {
        this.rejectEnrollmentStep(enrollment, result.step);
      }
    });
  }

  resendConfirmationEmail(enrollment: CourseEnrollment): void {
    if (!enrollment.finalApproval || this.normalizeEnrollmentStatus(enrollment.status) !== EnrollmentStatus.Approve) {
      this.toastr.error(
        this.translationService.instant('course.cannotResendEmailForNonApproved'),
        this.translationService.instant('common.error')
      );
      return;
    }

    // Show loading indicator
    this.loadingService.show();
    
    // Show info toast with loading message
    this.toastr.info(
      this.translationService.instant('course.sendingEmail'),
      '',
      { 
        timeOut: 0, 
        extendedTimeOut: 0,
        disableTimeOut: true,
        closeButton: false
      }
    );

    this.enrollmentService.resendConfirmationEmail(enrollment.id).subscribe({
      next: (response) => {
        this.loadingService.hide();
        this.toastr.clear(); // Clear the "sending" toast
        this.toastr.success(
          this.translationService.instant('course.emailSentSuccessfully'),
          this.translationService.instant('common.success')
        );
      },
      error: (error) => {
        this.loadingService.hide();
        this.toastr.clear(); // Clear the "sending" toast
        console.error('Error resending confirmation email:', error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.failedToSendEmail'),
          this.translationService.instant('common.error')
        );
      }
    });
  }

  // Helper function to normalize course status (handles string, number, or enum)
  private normalizeCourseStatus(status?: CourseStatus | string | number): number {
    if (!status) return CourseStatus.Draft;
    if (typeof status === 'string') {
      const statusMap: { [key: string]: number } = {
        'Draft': CourseStatus.Draft,
        'Published': CourseStatus.Published,
        'RegistrationClosed': CourseStatus.RegistrationClosed,
        'Active': CourseStatus.Active,
        'Completed': CourseStatus.Completed,
        'Canceled': CourseStatus.Canceled,
        'Archived': CourseStatus.Archived,
        'Rescheduled': CourseStatus.Rescheduled
      };
      return statusMap[status] ?? Number(status);
    }
    return Number(status);
  }

  isCheckInAllowed(enrollment: CourseEnrollment): boolean {
    // Check enrollment approval status, course status, and time window
    if (!this.course) {
      console.log('Check-in: Course not found');
      return false;
    }
    
    const enrollmentStatus = this.normalizeEnrollmentStatus(enrollment.status);
    if (enrollmentStatus !== EnrollmentStatus.Approve || !enrollment.finalApproval) {
      console.log('Check-in: Enrollment not approved', { status: enrollmentStatus, finalApproval: enrollment.finalApproval });
      return false;
    }

    // Course must be Active to allow check-in/check-out
    const courseStatusValue = this.normalizeCourseStatus(this.course.status);
    if (courseStatusValue !== CourseStatus.Active) {
      console.log('Check-in: Course not active', { status: this.course.status, normalized: courseStatusValue, expected: CourseStatus.Active });
      return false;
    }

    if (!this.course.startDateTime || !this.course.endDateTime) {
      console.log('Check-in: Course dates missing', { start: this.course.startDateTime, end: this.course.endDateTime });
      return false;
    }

    const now = new Date();
    const start = new Date(this.course.startDateTime);
    const end = new Date(this.course.endDateTime);

    // Allow check-in 1 hour before course starts and until 1 hour after course ends
    const windowStart = new Date(start.getTime() - 1 * 60 * 60 * 1000); // 1 hour before start
    const windowEnd = new Date(end.getTime() + 1 * 60 * 60 * 1000); // 1 hour after end

    const isInWindow = now >= windowStart && now <= windowEnd;
    if (!isInWindow) {
      console.log('Check-in: Outside time window', {
        now: now.toISOString(),
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        start: start.toISOString(),
        end: end.toISOString()
      });
    }

    return isInWindow;
  }

  hasCheckedIn(enrollment: CourseEnrollment): boolean {
    if (!enrollment?.id) return false;
    return this.attendanceRecords[enrollment.id]?.hasCheckIn || false;
  }

  hasCheckedOut(enrollment: CourseEnrollment): boolean {
    if (!enrollment?.id) return false;
    return this.attendanceRecords[enrollment.id]?.hasCheckOut || false;
  }

  isApprovedEnrollment(enrollment: CourseEnrollment): boolean {
    return this.normalizeEnrollmentStatus(enrollment.status) === EnrollmentStatus.Approve && enrollment.finalApproval === true;
  }

  isPendingEnrollment(enrollment: CourseEnrollment): boolean {
    return this.normalizeEnrollmentStatus(enrollment.status) === EnrollmentStatus.Pending;
  }

  canCheckIn(enrollment: CourseEnrollment): boolean {
    // Show check-in button for all approved users who haven't checked in yet
    if (!this.isApprovedEnrollment(enrollment) || this.hasCheckedIn(enrollment)) {
      return false;
    }
    // Check if within time window
    return this.isCheckInAllowed(enrollment);
  }

  canCheckOut(enrollment: CourseEnrollment): boolean {
    return this.isCheckInAllowed(enrollment) && this.hasCheckedIn(enrollment) && !this.hasCheckedOut(enrollment);
  }

  isCheckInDisabled(enrollment: CourseEnrollment): boolean {
    // Disable if not approved or already checked in
    if (!this.isApprovedEnrollment(enrollment) || this.hasCheckedIn(enrollment)) {
      return true;
    }
    // Disable if course is not active or outside time window
    return !this.isCheckInAllowed(enrollment);
  }

  getCheckInDisabledReason(enrollment: CourseEnrollment): string {
    if (!this.course) {
      return this.translationService.instant('attendance.courseNotFound');
    }
    const courseStatusValue = this.normalizeCourseStatus(this.course.status);
    if (courseStatusValue !== CourseStatus.Active) {
      return this.translationService.instant('attendance.courseNotActive');
    }
    if (!this.isCheckInAllowed(enrollment)) {
      return this.translationService.instant('attendance.checkInOutsideWindow');
    }
    return '';
  }

  checkIn(enrollment: CourseEnrollment): void {
    if (!enrollment || !enrollment.id) return;
    this.loadingService.show();
    this.attendanceService.checkIn(enrollment.id).subscribe({
      next: () => {
        this.toastr.success(this.translationService.instant('attendance.checkInSuccess'));
        this.loadingService.hide();
        // Reload attendance records to update UI
        this.loadAttendanceForEnrollments();
      },
      error: (error) => {
        this.toastr.error(error.error?.message || this.translationService.instant('attendance.checkInError'));
        this.loadingService.hide();
      }
    });
  }

  checkOut(enrollment: CourseEnrollment): void {
    if (!enrollment || !enrollment.id) return;
    this.loadingService.show();
    this.attendanceService.checkOut(enrollment.id).subscribe({
      next: () => {
        this.toastr.success(this.translationService.instant('attendance.checkOutSuccess'));
        this.loadingService.hide();
        // Reload attendance records to update UI
        this.loadAttendanceForEnrollments();
      },
      error: (error) => {
        this.toastr.error(error.error?.message || this.translationService.instant('attendance.checkOutError'));
        this.loadingService.hide();
      }
    });
  }

  // Helper function to normalize enrollment status (handles string, number, or enum)
  private normalizeEnrollmentStatus(status?: EnrollmentStatus | string | number): number {
    if (!status) return EnrollmentStatus.Pending;
    if (typeof status === 'string') {
      const statusMap: { [key: string]: number } = {
        'Pending': EnrollmentStatus.Pending,
        'Approve': EnrollmentStatus.Approve,
        'Reject': EnrollmentStatus.Reject,
        'Excuse': EnrollmentStatus.Excuse
      };
      return statusMap[status] ?? Number(status);
    }
    return Number(status);
  }

  getEnrollmentStatusClass(status?: EnrollmentStatus | string | number): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusValue = this.normalizeEnrollmentStatus(status);
    
    switch (statusValue) {
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

  getEnrollmentStatusText(status?: EnrollmentStatus | string | number): string {
    if (!status) return this.translationService.instant('course.pending');
    
    const statusValue = this.normalizeEnrollmentStatus(status);
    
    switch (statusValue) {
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

  getStatusClass(status: CourseStatus | string | number | undefined | null): string {
    if (status === undefined || status === null) return 'bg-gray-100 text-gray-800';
    
    // Convert string enum to number if needed
    let statusValue: number;
    if (typeof status === 'string') {
      // Map string enum names to numeric values
      const statusMap: { [key: string]: number } = {
        'Draft': CourseStatus.Draft,
        'Published': CourseStatus.Published,
        'RegistrationClosed': CourseStatus.RegistrationClosed,
        'Active': CourseStatus.Active,
        'Completed': CourseStatus.Completed,
        'Canceled': CourseStatus.Canceled,
        'Archived': CourseStatus.Archived,
        'Rescheduled': CourseStatus.Rescheduled,
      };
      statusValue = statusMap[status] ?? Number(status);
    } else {
      statusValue = Number(status);
    }

    const statusClasses: { [key: number]: string } = {
      [CourseStatus.Draft]: 'bg-gray-100 text-gray-800',
      [CourseStatus.Published]: 'bg-green-100 text-green-800',
      [CourseStatus.RegistrationClosed]: 'bg-yellow-100 text-yellow-800',
      [CourseStatus.Active]: 'bg-blue-100 text-blue-800',
      [CourseStatus.Completed]: 'bg-purple-100 text-purple-800',
      [CourseStatus.Canceled]: 'bg-red-100 text-red-800',
      [CourseStatus.Archived]: 'bg-gray-100 text-gray-600',
      [CourseStatus.Rescheduled]: 'bg-yellow-100 text-yellow-800',
    };
    return statusClasses[statusValue] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: CourseStatus | string | number | undefined | null): string {
    if (status === undefined || status === null) return 'Unknown';
    
    // Convert string enum to number if needed
    let statusValue: number;
    if (typeof status === 'string') {
      // Map string enum names to numeric values
      const statusMap: { [key: string]: number } = {
        'Draft': CourseStatus.Draft,
        'Published': CourseStatus.Published,
        'RegistrationClosed': CourseStatus.RegistrationClosed,
        'Active': CourseStatus.Active,
        'Completed': CourseStatus.Completed,
        'Canceled': CourseStatus.Canceled,
        'Archived': CourseStatus.Archived,
        'Rescheduled': CourseStatus.Rescheduled,
      };
      statusValue = statusMap[status] ?? Number(status);
    } else {
      statusValue = Number(status);
    }

    const statusTexts: { [key: number]: string } = {
      [CourseStatus.Draft]: 'Draft',
      [CourseStatus.Published]: 'Published',
      [CourseStatus.RegistrationClosed]: 'Registration Closed',
      [CourseStatus.Active]: 'Active',
      [CourseStatus.Completed]: 'Completed',
      [CourseStatus.Canceled]: 'Canceled',
      [CourseStatus.Archived]: 'Archived',
      [CourseStatus.Rescheduled]: 'Rescheduled',
    };
    return statusTexts[statusValue] || 'Unknown';
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



  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
  }

  getAvailableStatuses(): { value: CourseStatus; label: string }[] {
    if (!this.course) return [];

    const allStatuses = [
      { value: CourseStatus.Draft, label: this.translationService.instant('course.statusDraft') },
      { value: CourseStatus.Published, label: this.translationService.instant('course.statusPublished') },
      { value: CourseStatus.RegistrationClosed, label: this.translationService.instant('course.statusRegistrationClosed') },
      { value: CourseStatus.Active, label: this.translationService.instant('course.statusActive') },
      { value: CourseStatus.Completed, label: this.translationService.instant('course.statusCompleted') },
      { value: CourseStatus.Canceled, label: this.translationService.instant('course.statusCanceled') },
      { value: CourseStatus.Archived, label: this.translationService.instant('course.statusArchived') },
      { value: CourseStatus.Rescheduled, label: this.translationService.instant('course.statusRescheduled') },
    ];

    // Filter out current status
    return allStatuses.filter(s => s.value !== this.course!.status);
  }

  getStatusColor(status: CourseStatus): string {
    const colors: { [key: number]: string } = {
      [CourseStatus.Draft]: '#9CA3AF',
      [CourseStatus.Published]: '#10B981',
      [CourseStatus.RegistrationClosed]: '#F59E0B',
      [CourseStatus.Active]: '#3B82F6',
      [CourseStatus.Completed]: '#8B5CF6',
      [CourseStatus.Canceled]: '#EF4444',
      [CourseStatus.Archived]: '#6B7280',
      [CourseStatus.Rescheduled]: '#F59E0B',
    };
    return colors[status] || '#9CA3AF';
  }

  updateCourseStatus(newStatus: CourseStatus): void {
    if (!this.course) return;

    this.showStatusDropdown = false; // Close dropdown
    this.courseService.updateCourse(this.course.id!, { ...this.course, status: newStatus }).subscribe({
      next: () => {
        this.toastr.success(this.translationService.instant('course.statusUpdatedSuccessfully'));
        this.loadCourse(this.course!.id!);
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.statusUpdateFailed')
        );
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

  exportAllEnrollments(): void {
    if (!this.course?.id) return;

    this.loadingService.show();
    this.enrollmentService.exportEnrollments(this.course.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Course_Enrollments_All_${this.course?.courseTitle?.replace(/\s+/g, '_') || 'Course'}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.toastr.success(this.translationService.instant('course.exportSuccess'));
        this.loadingService.hide();
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.exportError')
        );
        this.loadingService.hide();
      },
    });
  }

  exportApprovedEnrollments(): void {
    if (!this.course?.id) return;

    this.loadingService.show();
    this.enrollmentService.exportEnrollments(this.course.id, EnrollmentStatus.Approve).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Course_Enrollments_Approved_${this.course?.courseTitle?.replace(/\s+/g, '_') || 'Course'}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.toastr.success(this.translationService.instant('course.exportSuccess'));
        this.loadingService.hide();
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.exportError')
        );
        this.loadingService.hide();
      },
    });
  }

  exportOrganizationEnrollments(orgName: string): void {
    if (!this.course?.id) return;

    // Find the organization ID from the enrollments
    const orgEnrollments = this.groupedEnrollments[orgName];
    if (!orgEnrollments || orgEnrollments.length === 0) return;

    const organizationId = orgEnrollments[0].user?.organizationId;
    if (!organizationId) return;

    this.loadingService.show();
    this.enrollmentService.exportEnrollments(this.course.id, undefined, organizationId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Course_Enrollments_${orgName.replace(/\s+/g, '_')}_${this.course?.courseTitle?.replace(/\s+/g, '_') || 'Course'}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.toastr.success(this.translationService.instant('course.exportSuccess'));
        this.loadingService.hide();
      },
      error: (error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.exportError')
        );
        this.loadingService.hide();
      },
    });
  }

  openManualEnrollment(): void {
    if (!this.course?.id) {
      this.toastr.error(this.translationService.instant('course.courseNotFound'));
      return;
    }

    const dialogRef = this.dialogService.open(CourseManualEnrollmentComponent, {
      data: { courseId: this.course.id },
      width: '900px',
      height: '90vh',
      maxHeight: '900px'
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload enrollments after successful enrollment
        this.loadEnrollments();
      }
    });
  }
}

