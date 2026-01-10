import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef, DialogService } from '@ngneat/dialog';
import { EventSessionEnrollmentService, EventSessionEnrollment } from '../../../../services/event-session-enrollment.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { TranslationService } from '../../../../services/translation.service';
import { finalize } from 'rxjs/operators';
import { DeleteConfirmationDialogComponent } from '../../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-event-session-enrollments-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './event-session-enrollments-dialog.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class EventSessionEnrollmentsDialogComponent implements OnInit {
  enrollments: EventSessionEnrollment[] = [];
  isLoading = false;
  sessionId: number = 0;
  sessionTitle: string = '';

  constructor(
    private dialogRef: DialogRef<{ sessionId: number; sessionTitle: string }>,
    private enrollmentService: EventSessionEnrollmentService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService
  ) {
    this.sessionId = this.dialogRef.data?.sessionId || 0;
    this.sessionTitle = this.dialogRef.data?.sessionTitle || '';
  }

  ngOnInit(): void {
    this.loadEnrollments();
  }

  loadEnrollments(): void {
    this.isLoading = true;
    this.loadingService.show();
    this.cdr.detectChanges(); // Update loading state immediately

    this.enrollmentService
      .getAll(1, 1000, undefined, this.sessionId)
      .subscribe({
        next: (response) => {
          console.log('Enrollments response:', response); // Debug log
          if (response && response.result && Array.isArray(response.result)) {
            // Create new array reference to trigger change detection
            this.enrollments = response.result.map(e => ({ ...e }));
            this.isLoading = false;
            this.loadingService.hide();
            this.cdr.detectChanges(); // Force change detection
          } else {
            this.enrollments = [];
            this.isLoading = false;
            this.loadingService.hide();
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error loading enrollments:', error); // Debug log
          this.toastr.error(
            error.error?.message || this.translationService.instant('common.error')
          );
          this.enrollments = [];
          this.isLoading = false;
          this.loadingService.hide();
          this.cdr.detectChanges();
        },
      });
  }

  approveEnrollment(enrollment: EventSessionEnrollment): void {
    if (!enrollment.id) return;

    this.loadingService.show();
    this.enrollmentService
      .approve(enrollment.id)
      .pipe(
        finalize(() => {
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.toastr.success(
            response.message || this.translationService.instant('eventSession.enrollmentApproved')
          );
          this.loadEnrollments(); // Reload to show updated status
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('common.error')
          );
        },
      });
  }

  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }

  deleteEnrollment(enrollment: EventSessionEnrollment): void {
    if (!enrollment.id) return;

    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('eventSession.deleteEnrollmentTitle'),
        message: this.translationService.instant('eventSession.deleteEnrollmentMessage', { name: enrollment.name }),
      },
      width: '400px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((confirmed) => {
      if (confirmed) {
        this.loadingService.show();
        this.enrollmentService
          .delete(enrollment.id!)
          .pipe(
            finalize(() => {
              this.loadingService.hide();
            })
          )
          .subscribe({
            next: (response) => {
              this.toastr.success(
                response.message || this.translationService.instant('eventSession.enrollmentDeleted')
              );
              this.loadEnrollments(); // Reload to remove deleted enrollment
              this.cdr.detectChanges();
            },
            error: (error) => {
              this.toastr.error(
                error.error?.message || this.translationService.instant('common.error')
              );
            },
          });
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}

