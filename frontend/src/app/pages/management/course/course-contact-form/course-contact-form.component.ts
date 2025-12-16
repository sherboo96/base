import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { CourseService } from '../../../../services/course.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-course-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './course-contact-form.component.html',
})
export class CourseContactFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: DialogRef<{ courseId: number; course: any; contact?: any; isEdit?: boolean }>,
    private courseService: CourseService,
    private toastr: ToastrService,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      phoneNumber: [''],
      emailAddress: ['', Validators.email],
    });
    this.isEdit = this.dialogRef.data?.isEdit || false;
  }

  ngOnInit(): void {
    if (this.isEdit && this.dialogRef.data?.contact) {
      this.form.patchValue({
        name: this.dialogRef.data.contact.name || '',
        phoneNumber: this.dialogRef.data.contact.phoneNumber || '',
        emailAddress: this.dialogRef.data.contact.emailAddress || '',
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

    if (this.isEdit) {
      // Update existing contact
      const updatedContacts = (course.courseContacts || []).map((c: any) => {
        if (c.id === this.dialogRef.data?.contact?.id) {
          return {
            ...c,
            name: formValue.name,
            phoneNumber: formValue.phoneNumber || '',
            emailAddress: formValue.emailAddress || '',
          };
        }
        return c;
      });

      const courseUpdate: any = {
        ...course,
        courseContacts: updatedContacts,
      };

      this.courseService.updateCourse(courseId, courseUpdate).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('course.updateCourseContactSuccess'));
          this.dialogRef.close(true);
        },
        error: (error: any) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('course.updateCourseContactError')
          );
        },
      });
    } else {
      // Add new contact
      const newContact = {
        name: formValue.name,
        phoneNumber: formValue.phoneNumber || '',
        emailAddress: formValue.emailAddress || '',
      };

      const updatedContacts = [...(course.courseContacts || []), newContact];

      const courseUpdate: any = {
        ...course,
        courseContacts: updatedContacts,
      };

      this.courseService.updateCourse(courseId, courseUpdate).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('course.addCourseContactSuccess'));
          this.dialogRef.close(true);
        },
        error: (error: any) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('course.addCourseContactError')
          );
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

