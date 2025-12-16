import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnrollmentService, CourseEnrollment, EnrollmentStatus } from '../../services/enrollment.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../services/loading.service';
import { LoadingComponent } from '../../components/loading/loading.component';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-request',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, TranslateModule],
  templateUrl: './request.component.html',
  styleUrl: './request.component.scss',
})
export class RequestComponent implements OnInit, OnDestroy {
  enrollments: CourseEnrollment[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private enrollmentService: EnrollmentService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.fetchPendingRequests();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  viewCourseDetails(course: any): void {
    if (course?.id) {
      // Open course details in a new tab
      const url = this.router.serializeUrl(
        this.router.createUrlTree(['/management/courses/details', course.id])
      );
      window.open(url, '_blank');
    }
  }

  fetchPendingRequests(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.enrollmentService
      .getPendingHeadApprovals(this.currentPage, this.pageSize)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.enrollments = response.result || [];
          this.totalItems = response.pagination?.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Failed to fetch pending requests');
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchPendingRequests();
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
    this.fetchPendingRequests();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  approveRequest(enrollment: CourseEnrollment): void {
    // Find the head approval step
    const headApprovalStep = enrollment.approvalSteps?.find(step => step.courseTabApproval?.isHeadApproval);

    if (!headApprovalStep) {
      this.toastr.error('Head approval step not found');
      return;
    }

    this.loadingService.show();
    this.enrollmentService.approveEnrollmentStep(enrollment.id, headApprovalStep.courseTabApprovalId)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: () => {
          this.toastr.success('Request approved successfully');
          this.fetchPendingRequests();
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Failed to approve request');
        }
      });
  }

  rejectRequest(enrollment: CourseEnrollment): void {
    // Find the head approval step
    const headApprovalStep = enrollment.approvalSteps?.find(step => step.courseTabApproval?.isHeadApproval);

    if (!headApprovalStep) {
      this.toastr.error('Head approval step not found');
      return;
    }

    const comments = prompt('Please provide a reason for rejection (optional):');

    this.loadingService.show();
    this.enrollmentService.rejectEnrollmentStep(enrollment.id, headApprovalStep.courseTabApprovalId, comments || undefined)
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: () => {
          this.toastr.success('Request rejected successfully');
          this.fetchPendingRequests();
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Failed to reject request');
        }
      });
  }
}
