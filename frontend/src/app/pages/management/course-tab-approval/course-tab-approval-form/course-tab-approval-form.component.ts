import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CourseTabApprovalService } from '../../../../services/course-tab-approval.service';
import { CourseTabService, CourseTab } from '../../../../services/course-tab.service';
import { UserService } from '../../../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';
import { LoadingService } from '../../../../services/loading.service';

@Component({
  selector: 'app-course-tab-approval-form',
  templateUrl: './course-tab-approval-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        height: 90vh;
        overflow: hidden;
      }
      
      .dialog-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      
      .form-scroll-container {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: auto;
        scrollbar-color: #0b5367 #f1f1f1;
        -webkit-overflow-scrolling: touch;
      }
      
      .form-scroll-container::-webkit-scrollbar {
        width: 14px;
      }
      
      .form-scroll-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
        margin: 4px 0;
      }
      
      .form-scroll-container::-webkit-scrollbar-thumb {
        background: #0b5367;
        border-radius: 10px;
        border: 2px solid #f1f1f1;
        min-height: 40px;
      }
      
      .form-scroll-container::-webkit-scrollbar-thumb:hover {
        background: #094152;
      }
      
      .form-scroll-container::-webkit-scrollbar-thumb:active {
        background: #062d38;
      }
      
      .dialog-header {
        flex-shrink: 0;
      }
      
      .dialog-actions {
        flex-shrink: 0;
      }
    `,
  ],
})
export class CourseTabApprovalFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  courseTabs: CourseTab[] = [];
  roles: any[] = [];

  constructor(
    private fb: FormBuilder,
    private courseTabApprovalService: CourseTabApprovalService,
    private courseTabService: CourseTabService,
    private userService: UserService,
    private toastr: ToastrService,
    private dialogRef: DialogRef,
    private translationService: TranslationService,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      courseTabId: [null, Validators.required],
      approvalOrder: [1, [Validators.required, Validators.min(1)]],
      isHeadApproval: [false],
      isFinalApproval: [false],
      roleId: [null],
    });
  }

  ngOnInit(): void {
    this.loadCourseTabs();
    this.loadRoles();

    if (this.dialogRef.data?.approval) {
      this.isEdit = true;
      const approval = this.dialogRef.data.approval;
      this.form.patchValue({
        courseTabId: approval.courseTabId,
        approvalOrder: approval.approvalOrder,
        isHeadApproval: approval.isHeadApproval,
        isFinalApproval: approval.isFinalApproval || false,
        roleId: approval.roleId || null,
      });
      // Disable courseTabId in edit mode
      this.form.get('courseTabId')?.disable();
    } else if (this.dialogRef.data?.courseTab) {
      // Pre-select course tab if provided
      this.form.patchValue({
        courseTabId: this.dialogRef.data.courseTab.id,
      });
    }

    // Watch isHeadApproval changes
    this.form.get('isHeadApproval')?.valueChanges.subscribe((isHead) => {
      if (isHead) {
        // If head approval, clear role and disable it
        this.form.patchValue({ roleId: null }, { emitEvent: false });
        this.form.get('roleId')?.disable();
      } else {
        this.form.get('roleId')?.enable();
      }
      this.cdr.detectChanges();
    });
  }

  loadCourseTabs(): void {
    if (this.dialogRef.data?.courseTabs) {
      this.courseTabs = this.dialogRef.data.courseTabs;
      this.cdr.detectChanges();
      return;
    }

    this.courseTabService.getCourseTabs(1, 1000).subscribe({
      next: (response) => {
        this.courseTabs = response.result || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading course tabs:', error);
        this.toastr.error(
          this.translationService.instant('courseTabApproval.loadCourseTabsError')
        );
      },
    });
  }

  loadRoles(): void {
    this.userService.getRoles(1, 1000).subscribe({
      next: (response) => {
        this.roles = response.result || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.toastr.error(
          this.translationService.instant('courseTabApproval.loadRolesError')
        );
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning(
        this.translationService.instant('common.formInvalid')
      );
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    const formValue = this.form.getRawValue();
    const payload = {
      courseTabId: formValue.courseTabId,
      approvalOrder: formValue.approvalOrder,
      isHeadApproval: formValue.isHeadApproval,
      isFinalApproval: formValue.isFinalApproval,
      roleId: formValue.roleId || null,
    };

    if (this.isEdit) {
      const approvalId = this.dialogRef.data.approval.id!;
      const updatePayload = {
        approvalOrder: payload.approvalOrder,
        isHeadApproval: payload.isHeadApproval,
        isFinalApproval: payload.isFinalApproval,
        roleId: payload.roleId,
      };
      this.courseTabApprovalService
        .updateCourseTabApproval(approvalId, updatePayload)
        .subscribe({
          next: () => {
            this.toastr.success(
              this.translationService.instant('courseTabApproval.updateSuccess')
            );
            this.loadingService.hide();
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message ||
                this.translationService.instant('courseTabApproval.updateError')
            );
            this.loadingService.hide();
            this.isSubmitting = false;
          },
        });
    } else {
      this.courseTabApprovalService.createCourseTabApproval(payload).subscribe({
        next: () => {
          this.toastr.success(
            this.translationService.instant('courseTabApproval.createSuccess')
          );
          this.loadingService.hide();
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message ||
              this.translationService.instant('courseTabApproval.createError')
          );
          this.loadingService.hide();
          this.isSubmitting = false;
        },
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

