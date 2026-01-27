import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { EnrollmentService } from '../../../../../services/enrollment.service';

export interface EmailHistory {
  id: number;
  courseEnrollmentId: number;
  templateFileName: string;
  subject: string;
  emailBody: string;
  sentAt: string;
  isSuccess: boolean;
  errorMessage?: string;
  sentBy: string;
}

@Component({
  selector: 'app-enrollment-email-history-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './enrollment-email-history-dialog.component.html',
  styleUrl: './enrollment-email-history-dialog.component.scss'
})
export class EnrollmentEmailHistoryDialogComponent implements OnInit {
  enrollmentId!: number;
  emailHistory: EmailHistory[] = [];
  isLoading = false;
  selectedEmail: EmailHistory | null = null;

  constructor(
    public dialogRef: DialogRef,
    private enrollmentService: EnrollmentService,
    private cdr: ChangeDetectorRef
  ) {
    this.enrollmentId = this.dialogRef.data?.enrollmentId;
  }

  ngOnInit(): void {
    this.loadEmailHistory();
  }

  loadEmailHistory(): void {
    if (!this.enrollmentId) return;

    this.isLoading = true;
    this.cdr.detectChanges(); // Force UI update immediately
    
    this.enrollmentService.getEnrollmentEmailHistory(this.enrollmentId).subscribe({
      next: (response: any) => {
        console.log('Email history response:', response); // For debugging
        
        // Handle both camelCase and PascalCase response properties
        const history = response?.result || response?.Result || [];
        
        if (Array.isArray(history) && history.length > 0) {
          this.emailHistory = history;
        } else {
          console.warn('No email history found in response:', response);
          this.emailHistory = [];
        }
        
        this.isLoading = false;
        this.cdr.detectChanges(); // Force UI update after loading
      },
      error: (error) => {
        console.error('Error loading email history:', error);
        this.emailHistory = [];
        this.isLoading = false;
        this.cdr.detectChanges(); // Force UI update on error
      },
      complete: () => {
        // Ensure loading state is cleared even if something goes wrong
        this.isLoading = false;
        this.cdr.detectChanges(); // Force UI update on complete
      }
    });
  }

  viewEmail(email: EmailHistory): void {
    this.selectedEmail = email;
  }

  closeEmailView(): void {
    this.selectedEmail = null;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  close(): void {
    this.dialogRef.close();
  }
}
