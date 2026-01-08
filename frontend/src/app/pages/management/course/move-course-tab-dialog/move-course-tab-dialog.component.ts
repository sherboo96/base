import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { CourseService, Course } from '../../../../services/course.service';
import { CourseTabService } from '../../../../services/course-tab.service';
import { LoadingService } from '../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-move-course-tab-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center space-x-3 mb-2">
          <div class="p-2 bg-accent/10 rounded-lg">
            <i class="fas fa-exchange-alt text-accent text-xl"></i>
          </div>
          <div>
            <h3 class="text-xl font-bold text-textDark font-poppins">
              {{ 'course.moveToCourseTab' | translate }}
            </h3>
            <p class="text-sm text-gray-600 mt-1 font-poppins">
              {{ 'course.moveToCourseTabDescription' | translate }}
            </p>
          </div>
        </div>
      </div>

      <!-- Course Info -->
      <div *ngIf="course" class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-start gap-3">
          <div class="flex-1">
            <h4 class="text-sm font-semibold text-gray-900 font-poppins mb-1">
              {{ course.courseTitle }}
            </h4>
            <p class="text-xs text-gray-600 font-poppins">
              <span class="font-medium">{{ 'course.currentCourseTab' | translate }}:</span>
              {{ course.courseTab?.name || '-' }}
            </p>
            <p class="text-xs text-gray-600 font-poppins mt-1">
              <span class="font-medium">{{ 'course.code' | translate }}:</span>
              {{ course.code }}
            </p>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Course Tab Selection -->
        <div class="space-y-2">
          <label for="courseTabId" class="block text-sm font-medium text-gray-700 font-poppins">
            {{ 'course.selectNewCourseTab' | translate }}
            <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-folder text-gray-400"></i>
            </div>
            <select
              id="courseTabId"
              formControlName="courseTabId"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 appearance-none bg-white font-poppins"
              [class.border-red-500]="form.get('courseTabId')?.invalid && form.get('courseTabId')?.touched"
            >
              <option [value]="null">{{ 'course.selectCourseTab' | translate }}</option>
              <option *ngFor="let tab of courseTabs" [value]="tab.id">
                {{ tab.name }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
            </div>
          </div>
          <div *ngIf="form.get('courseTabId')?.invalid && form.get('courseTabId')?.touched" class="flex items-center text-sm text-red-600">
            <i class="fas fa-exclamation-circle mr-1"></i>
            <span>{{ 'course.courseTabRequired' | translate }}</span>
          </div>
        </div>

        <!-- Warning Message -->
        <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-start gap-2">
            <i class="fas fa-exclamation-triangle text-yellow-600 mt-0.5"></i>
            <p class="text-xs text-yellow-800 font-poppins">
              {{ 'course.moveCourseTabWarning' | translate }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            (click)="onCancel()"
            class="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium font-poppins"
          >
            {{ 'common.cancel' | translate }}
          </button>
          <button
            type="submit"
            [disabled]="form.invalid || isSubmitting"
            class="px-6 py-2.5 bg-accentDark text-white rounded-lg hover:bg-accentDarker transition-all duration-200 shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed font-poppins"
          >
            <span *ngIf="!isSubmitting" class="flex items-center gap-2">
              <i class="fas fa-exchange-alt"></i>
              <span>{{ 'course.move' | translate }}</span>
            </span>
            <span *ngIf="isSubmitting" class="flex items-center gap-2">
              <i class="fas fa-spinner fa-spin"></i>
              <span>{{ 'common.moving' | translate }}</span>
            </span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class MoveCourseTabDialogComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  courseTabs: any[] = [];
  course: Course | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: DialogRef<{ course: Course; courseTabs: any[] }>,
    private courseService: CourseService,
    private courseTabService: CourseTabService,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      courseTabId: [null, [Validators.required]]
    });
  }

  ngOnInit(): void {
    const course = this.dialogRef.data?.course;
    const courseTabs = this.dialogRef.data?.courseTabs || [];
    
    if (!course) {
      this.toastr.error(this.translationService.instant('course.courseNotFound'));
      this.dialogRef.close(false);
      return;
    }

    this.course = course;
    this.courseTabs = courseTabs.filter(tab => tab.id !== course.courseTabId); // Exclude current course tab

    // If no course tabs provided, load them
    if (this.courseTabs.length === 0) {
      this.loadCourseTabs();
    }
  }

  loadCourseTabs(): void {
    this.courseTabService.getCourseTabs(1, 1000).subscribe({
      next: (response) => {
        if (response.result) {
          // Exclude current course tab
          this.courseTabs = response.result.filter((tab: any) => tab.id !== this.course?.courseTabId);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading course tabs:', error);
        this.toastr.error(this.translationService.instant('course.loadCourseTabsError'));
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.course?.id) {
      this.toastr.error(this.translationService.instant('course.courseNotFound'));
      return;
    }

    // Store course ID in local variable to avoid TypeScript null check issues
    const courseId = this.course.id;
    const newCourseTabId = this.form.value.courseTabId;
    
    // Don't allow moving to the same course tab
    if (newCourseTabId === this.course.courseTabId) {
      this.toastr.warning(this.translationService.instant('course.sameCourseTabError'));
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    // Get the full course data and update only the courseTabId
    this.courseService.getCourse(courseId).subscribe({
      next: (response) => {
        const fullCourse = response.result || response;
        if (!fullCourse) {
          this.loadingService.hide();
          this.isSubmitting = false;
          this.toastr.error(this.translationService.instant('course.courseNotFound'));
          return;
        }

        // Prepare update data - keep all existing fields, only change courseTabId
        const { id, createdAt, createdBy, updatedAt, updatedBy, ...courseData } = fullCourse;
        const updatedCourse = {
          ...courseData,
          courseTabId: newCourseTabId
        };

        this.courseService.updateCourse(courseId, updatedCourse).subscribe({
          next: (updated) => {
            this.loadingService.hide();
            this.isSubmitting = false;
            this.toastr.success(
              this.translationService.instant('course.moveCourseTabSuccess')
            );
            // Close dialog and return the updated course
            this.dialogRef.close(updated);
          },
          error: (error) => {
            this.loadingService.hide();
            this.isSubmitting = false;
            this.toastr.error(
              error.error?.message || this.translationService.instant('course.moveCourseTabError')
            );
          },
        });
      },
      error: (error) => {
        this.loadingService.hide();
        this.isSubmitting = false;
        this.toastr.error(
          error.error?.message || this.translationService.instant('course.loadCourseError')
        );
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}

