import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../../services/loading.service';
import { EnrollmentService } from '../../../../../services/enrollment.service';
import { CourseEnrollment } from '../../../../../services/enrollment.service';

export interface EmailTemplate {
  fileName: string;
  displayName: string;
  description: string;
}

@Component({
  selector: 'app-send-email-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './send-email-dialog.component.html',
  styleUrl: './send-email-dialog.component.scss'
})
export class SendEmailDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  templates: EmailTemplate[] = [];
  selectedEnrollments: CourseEnrollment[] = [];
  isLoadingTemplates = false;
  isSending = false;
  sendingProgress = 0;
  sendingTotal = 0;
  Math = Math; // Expose Math to template
  private progressInterval: any;

  constructor(
    private fb: FormBuilder,
    public dialogRef: DialogRef,
    private enrollmentService: EnrollmentService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      templateFileName: ['', Validators.required],
      subject: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.selectedEnrollments = this.dialogRef.data?.enrollments || [];
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.isLoadingTemplates = true;
    this.cdr.detectChanges(); // Force UI update
    
    this.enrollmentService.getEmailTemplates().subscribe({
      next: (response: any) => {
        console.log('Email templates response:', response);
        
        // Handle both camelCase and PascalCase response properties
        const templates = response?.result || response?.Result || [];
        
        if (Array.isArray(templates) && templates.length > 0) {
          this.templates = templates;
        } else {
          console.warn('No templates found in response:', response);
          this.templates = [];
        }
        
        this.isLoadingTemplates = false;
        this.cdr.detectChanges(); // Force UI update after loading
      },
      error: (error) => {
        console.error('Error loading email templates:', error);
        this.toastr.error(error.error?.message || 'Failed to load email templates');
        this.isLoadingTemplates = false;
        this.templates = [];
        this.cdr.detectChanges(); // Force UI update on error
      },
      complete: () => {
        // Ensure loading state is cleared even if something goes wrong
        this.isLoadingTemplates = false;
        this.cdr.detectChanges(); // Force UI update on complete
      }
    });
  }

  onTemplateChange(): void {
    const selectedTemplate = this.form.get('templateFileName')?.value;
    if (selectedTemplate && !this.form.get('subject')?.value) {
      // Auto-fill subject based on template name
      const template = this.templates.find(t => t.fileName === selectedTemplate);
      if (template) {
        const subject = template.displayName
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        this.form.patchValue({ subject });
      }
    }
  }

  sendEmails(): void {
    if (this.form.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      this.toastr.error('Please fill in all required fields');
      return;
    }

    if (this.selectedEnrollments.length === 0) {
      this.toastr.error('No enrollments selected');
      return;
    }

    this.isSending = true;
    this.sendingProgress = 0;
    this.sendingTotal = this.selectedEnrollments.length;
    this.loadingService.show();
    this.cdr.detectChanges();

    const enrollmentIds = this.selectedEnrollments.map(e => e.id);
    const templateFileName = this.form.get('templateFileName')?.value;
    const subject = this.form.get('subject')?.value;

    // Simulate progress (since backend sends all at once, we'll show progress based on time)
    this.progressInterval = setInterval(() => {
      if (this.sendingProgress < this.sendingTotal - 1) {
        this.sendingProgress += 0.5;
        this.cdr.detectChanges();
      }
    }, 200);

    this.enrollmentService.sendBulkEmail(enrollmentIds, templateFileName, subject).subscribe({
      next: (response: any) => {
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
        }
        this.sendingProgress = this.sendingTotal;
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.loadingService.hide();
          this.isSending = false;
          this.sendingProgress = 0;
          this.cdr.detectChanges();
          
          if (response && response.result) {
            const successCount = response.result.successCount || 0;
            const failCount = response.result.failCount || 0;
            
            if (failCount === 0) {
              this.toastr.success(`Successfully sent ${successCount} email(s)`, '', {
                timeOut: 3000,
                progressBar: true
              });
            } else {
              this.toastr.warning(`Sent ${successCount} email(s), ${failCount} failed`, '', {
                timeOut: 4000,
                progressBar: true
              });
              // Log errors if available
              if (response.result.errors && response.result.errors.length > 0) {
                console.warn('Email sending errors:', response.result.errors);
              }
            }
          } else {
            this.toastr.success('Emails sent successfully', '', {
              timeOut: 3000,
              progressBar: true
            });
          }
          
          // Close dialog and trigger UI update
          this.dialogRef.close(true);
        }, 500);
      },
      error: (error) => {
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
        }
        this.loadingService.hide();
        this.isSending = false;
        this.sendingProgress = 0;
        this.cdr.detectChanges();
        const errorMessage = error.error?.message || error.message || 'Failed to send emails';
        this.toastr.error(errorMessage, 'Error', {
          timeOut: 5000,
          progressBar: true
        });
      }
    });
  }

  cancel(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    this.dialogRef.close(false);
  }

  ngOnDestroy(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }
}
