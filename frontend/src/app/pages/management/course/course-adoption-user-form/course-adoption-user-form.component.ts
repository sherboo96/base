import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { CourseService, AdoptionType, AttendanceType } from '../../../../services/course.service';
import { AdoptionUserService, AdoptionUser } from '../../../../services/adoption-user.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-course-adoption-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './course-adoption-user-form.component.html',
})
export class CourseAdoptionUserFormComponent implements OnInit {
  form: FormGroup;
  adoptionUsers: AdoptionUser[] = [];
  AdoptionType = AdoptionType;
  AttendanceType = AttendanceType;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: DialogRef<{ courseId: number; course: any; adoptionUser?: any; adoptionUsers?: AdoptionUser[]; isEdit?: boolean }>,
    private courseService: CourseService,
    private adoptionUserService: AdoptionUserService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      adoptionUserId: [null, Validators.required],
      adoptionType: [AdoptionType.Other, Validators.required],
      attendanceType: [AttendanceType.Optional, Validators.required],
    });
    this.isEdit = this.dialogRef.data?.isEdit || false;
  }

  ngOnInit(): void {
    this.loadAdoptionUsers();
    if (this.isEdit && this.dialogRef.data?.adoptionUser) {
      this.form.patchValue({
        adoptionUserId: this.dialogRef.data.adoptionUser.adoptionUserId,
        adoptionType: this.dialogRef.data.adoptionUser.adoptionType,
        attendanceType: this.dialogRef.data.adoptionUser.attendanceType || AttendanceType.Optional,
      });
    }
  }

  loadAdoptionUsers(): void {
    const orgId = this.dialogRef.data?.course?.organizationId;
    if (orgId) {
      this.adoptionUserService.getAdoptionUsers(1, 1000, undefined, orgId).subscribe({
        next: (response: any) => {
          // Handle both direct array and BaseResponse structure
          if (Array.isArray(response)) {
            this.adoptionUsers = response;
          } else if (response?.result) {
            this.adoptionUsers = Array.isArray(response.result) ? response.result : [];
          } else if (response?.data) {
            this.adoptionUsers = Array.isArray(response.data) ? response.data : [];
          } else {
            this.adoptionUsers = [];
          }
          console.log('Loaded adoption users:', this.adoptionUsers);
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error loading adoption users:', error);
          this.adoptionUsers = [];
          this.cdr.detectChanges();
        },
      });
    } else {
      console.warn('No organization ID found in course data');
      // Try loading without organization filter
      this.adoptionUserService.getAdoptionUsers(1, 1000).subscribe({
        next: (response: any) => {
          if (Array.isArray(response)) {
            this.adoptionUsers = response;
          } else if (response?.result) {
            this.adoptionUsers = Array.isArray(response.result) ? response.result : [];
          } else if (response?.data) {
            this.adoptionUsers = Array.isArray(response.data) ? response.data : [];
          } else {
            this.adoptionUsers = [];
          }
          console.log('Loaded adoption users (no org filter):', this.adoptionUsers);
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error loading adoption users:', error);
          this.adoptionUsers = [];
          this.cdr.detectChanges();
        },
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const course = this.dialogRef.data?.course;
    const courseId = this.dialogRef.data?.courseId;

    if (!course || !courseId) return;

    // Ensure adoptionType and attendanceType are numbers (enum values)
    const adoptionType = typeof formValue.adoptionType === 'string' 
      ? parseInt(formValue.adoptionType, 10) 
      : Number(formValue.adoptionType);
    const attendanceType = typeof formValue.attendanceType === 'string' 
      ? parseInt(formValue.attendanceType, 10) 
      : Number(formValue.attendanceType);

    if (this.isEdit) {
      // Update existing adoption user
      const updatedAdoptionUsers = (course.adoptionUsers || []).map((au: any) => {
        if (au.adoptionUserId === this.dialogRef.data?.adoptionUser?.adoptionUserId) {
          return {
            ...au,
            adoptionUserId: formValue.adoptionUserId,
            adoptionType: adoptionType,
            attendanceType: attendanceType,
          };
        }
        return au;
      });

      const courseUpdate: any = {
        ...course,
        adoptionUsers: updatedAdoptionUsers,
      };

      this.courseService.updateCourse(courseId, courseUpdate).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('course.updateAdoptionUserSuccess'));
          this.dialogRef.close(true);
        },
        error: (error: any) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('course.updateAdoptionUserError')
          );
        },
      });
    } else {
      // Add new adoption user
      const newAdoptionUser = {
        adoptionUserId: formValue.adoptionUserId,
        adoptionType: adoptionType,
        attendanceType: attendanceType,
      };

      // Check if already exists
      const exists = (course.adoptionUsers || []).some(
        (au: any) => au.adoptionUserId === formValue.adoptionUserId
      );

      if (exists) {
        this.toastr.error(this.translationService.instant('course.adoptionUserAlreadyExists'));
        return;
      }

      const updatedAdoptionUsers = [...(course.adoptionUsers || []), newAdoptionUser];

      const courseUpdate: any = {
        ...course,
        adoptionUsers: updatedAdoptionUsers,
      };

      this.courseService.updateCourse(courseId, courseUpdate).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('course.addAdoptionUserSuccess'));
          this.dialogRef.close(true);
        },
        error: (error: any) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('course.addAdoptionUserError')
          );
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

