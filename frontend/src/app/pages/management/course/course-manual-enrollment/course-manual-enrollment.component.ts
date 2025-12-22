import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { firstValueFrom, Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { UserService, User, UserResponse } from '../../../../services/user.service';
import { EnrollmentService } from '../../../../services/enrollment.service';
import { OrganizationService, OrganizationResponse } from '../../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';
import { LoadingService } from '../../../../services/loading.service';

@Component({
  selector: 'app-course-manual-enrollment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './course-manual-enrollment.component.html',
  styleUrls: ['./course-manual-enrollment.component.scss']
})
export class CourseManualEnrollmentComponent implements OnInit, OnDestroy {
  form: FormGroup;
  users: User[] = [];
  organizations: any[] = [];
  selectedUserIds: Set<string> = new Set();
  isLoading = false;
  currentPage = 1;
  pageSize = 50;
  totalUsers = 0;
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private enrollmentService: EnrollmentService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private loadingService: LoadingService,
    private dialogRef: DialogRef<{ courseId: number }>,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      search: [''],
      organizationId: [null]
    });
  }

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadUsers();

    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(500), // Wait 500ms after user stops typing
      distinctUntilChanged(), // Only trigger if value actually changed
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.currentPage = 1;
      this.loadUsers();
    });

    // Watch for search changes and emit to search subject
    this.form.get('search')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(search => {
      this.searchSubject.next(search || '');
    });

    // Watch for organization filter changes
    this.form.get('organizationId')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadUsers();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
  }

  loadOrganizations(): void {
    this.organizationService.getOrganizations(1, 1000).subscribe({
      next: (response: OrganizationResponse) => {
        if (response.statusCode === 200 && response.result) {
          this.organizations = response.result.filter((org: any) => org.isActive && !org.isDeleted);
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('Error loading organizations:', error);
      }
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    const searchTerm = this.form.get('search')?.value || '';
    const organizationId = this.form.get('organizationId')?.value || null;
    
    this.userService.getUsers(
      this.currentPage,
      this.pageSize,
      searchTerm || undefined,
      organizationId || undefined
    ).subscribe({
      next: (response: UserResponse) => {
        if (response.statusCode === 200 && response.result) {
          // Backend already filters by search and organization, so use results directly
          this.users = response.result.filter((user: User) => user.isActive && !user.isDeleted);
          this.totalUsers = response.total || 0;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
        this.isLoading = false;
        this.toastr.error(this.translationService.instant('course.loadUsersError'));
        this.cdr.detectChanges();
      }
    });
  }

  toggleUserSelection(userId: number | string): void {
    const userIdStr = userId.toString();
    if (this.selectedUserIds.has(userIdStr)) {
      this.selectedUserIds.delete(userIdStr);
    } else {
      this.selectedUserIds.add(userIdStr);
    }
    this.cdr.detectChanges();
  }

  isUserSelected(userId: number | string): boolean {
    return this.selectedUserIds.has(userId.toString());
  }

  getSelectedUsers(): User[] {
    return this.users.filter(user => this.selectedUserIds.has(user.id.toString()));
  }

  onSubmit(): void {
    if (this.selectedUserIds.size === 0) {
      this.toastr.warning(this.translationService.instant('course.selectAtLeastOneUser'));
      return;
    }

    const courseId = this.dialogRef.data?.courseId;
    if (!courseId) {
      this.toastr.error(this.translationService.instant('course.courseNotFound'));
      return;
    }

    this.loadingService.show();
    const enrollments = Array.from(this.selectedUserIds).map(userId => 
      firstValueFrom(this.enrollmentService.manualEnroll(courseId, userId))
    );

    Promise.all(enrollments).then(
      (results: any[]) => {
        this.loadingService.hide();
        const successCount = results.filter((r: any) => r && (r.statusCode === 201 || r?.statusCode === 200)).length;
        const failedCount = this.selectedUserIds.size - successCount;

        if (successCount > 0) {
          this.toastr.success(
            this.translationService.instant('course.manualEnrollmentSuccess', { count: successCount })
          );
        }
        if (failedCount > 0) {
          this.toastr.warning(
            this.translationService.instant('course.manualEnrollmentPartial', { count: failedCount })
          );
        }

        this.dialogRef.close(true);
      },
      (error: any) => {
        this.loadingService.hide();
        this.toastr.error(this.translationService.instant('course.manualEnrollmentError'));
        console.error('Error enrolling users:', error);
      }
    );
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getUserDisplayName(user: User): string {
    return user.fullName || user.email || 'Unknown';
  }

  getUserOrganization(user: User): string {
    return user.position?.department?.organization?.name || '-';
  }

  getUserDepartment(user: User): string {
    return user.position?.department?.name || '-';
  }

  getUserEmail(user: User): string {
    return user.email || '-';
  }

  // Expose Math to template
  Math = Math;

  goToFirstPage(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadUsers();
    }
  }

  goToNextPage(): void {
    const totalPages = Math.ceil(this.totalUsers / this.pageSize);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.loadUsers();
    }
  }

  goToLastPage(): void {
    const totalPages = Math.ceil(this.totalUsers / this.pageSize);
    this.currentPage = totalPages;
    this.loadUsers();
  }
}

