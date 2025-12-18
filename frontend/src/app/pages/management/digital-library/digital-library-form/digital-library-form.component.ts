import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { DigitalLibraryService, DigitalLibraryItem } from '../../../../services/digital-library.service';
import { CourseService } from '../../../../services/course.service';
import { CourseTabService } from '../../../../services/course-tab.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';
import { StorageService } from '../../../../services/storage.service';
import { LoadingService } from '../../../../services/loading.service';
import { AttachmentService } from '../../../../services/attachment.service';

@Component({
  selector: 'app-digital-library-form',
  templateUrl: './digital-library-form.component.html',
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
      
      .dialog-header {
        flex-shrink: 0;
      }
      
      .dialog-actions {
        flex-shrink: 0;
      }
    `,
  ],
})
export class DigitalLibraryFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  courses: any[] = [];
  selectedPosterFile: File | null = null;
  posterPreview: string | null = null;
  courseTabId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private digitalLibraryService: DigitalLibraryService,
    private courseService: CourseService,
    private courseTabService: CourseTabService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ item?: DigitalLibraryItem; courseTabId?: number }>,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService,
    private storageService: StorageService,
    public loadingService: LoadingService,
    private attachmentService: AttachmentService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nameAr: ['', Validators.required],
      description: [''],
      courseId: [null],
      showPublic: [false],
    });

    if (this.dialogRef.data?.item) {
      this.isEdit = true;
      const item = this.dialogRef.data.item;
      this.form.patchValue({
        name: item.name || '',
        nameAr: item.nameAr || '',
        description: item.description || '',
        courseId: item.courseId || null,
        showPublic: item.showPublic || false,
      });
      if (item.posterPath) {
        this.posterPreview = this.attachmentService.getFileUrl(item.posterPath);
      }
    }

    if (this.dialogRef.data?.courseTabId) {
      this.courseTabId = this.dialogRef.data.courseTabId;
    }
  }

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    if (!this.courseTabId) return;

    this.courseService.getCourses(1, 1000, undefined, undefined, this.courseTabId).subscribe({
      next: (response) => {
        this.courses = response.result || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading courses:', error);
      },
    });
  }

  onPosterFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedPosterFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.posterPreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removePoster(): void {
    this.selectedPosterFile = null;
    this.posterPreview = null;
    const fileInput = document.getElementById('posterFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error(this.translationService.instant('digitalLibrary.formInvalid'));
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    const formData = this.form.value;
    const formDataToSend = new FormData();

    formDataToSend.append('name', formData.name);
    formDataToSend.append('nameAr', formData.nameAr);
    formDataToSend.append('description', formData.description || '');
    if (formData.courseId) {
      formDataToSend.append('courseId', formData.courseId.toString());
    }
    formDataToSend.append('showPublic', formData.showPublic ? 'true' : 'false');

    // Get organization ID from current user
    const currentUser = this.storageService.getItem<any>('currentUser');
    const organizationId = currentUser?.organizationId || currentUser?.organization?.id;
    if (organizationId) {
      formDataToSend.append('organizationId', organizationId.toString());
    }

    // Always send PosterPath (empty string if no file, or existing path if editing without new file)
    if (this.isEdit && this.dialogRef.data?.item?.posterPath && !this.selectedPosterFile) {
      // Keep existing poster path if editing and no new file selected
      formDataToSend.append('posterPath', this.dialogRef.data.item.posterPath);
    } else if (!this.selectedPosterFile) {
      // Send empty string if no file is provided
      formDataToSend.append('posterPath', '');
    }

    // Add poster file if selected (this will override posterPath in backend)
    if (this.selectedPosterFile) {
      formDataToSend.append('posterFile', this.selectedPosterFile);
    }

    if (this.isEdit && this.dialogRef.data?.item) {
      // Update existing item
      this.digitalLibraryService.updateItem(this.dialogRef.data.item.id, formDataToSend).subscribe({
        next: (response) => {
          this.toastr.success(this.translationService.instant('digitalLibrary.updateSuccess'));
          this.loadingService.hide();
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('digitalLibrary.updateError')
          );
          this.isSubmitting = false;
          this.loadingService.hide();
        },
      });
    } else {
      // Create new item
      this.digitalLibraryService.createItem(formDataToSend).subscribe({
        next: (response) => {
          this.toastr.success(this.translationService.instant('digitalLibrary.createSuccess'));
          this.loadingService.hide();
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('digitalLibrary.createError')
          );
          this.isSubmitting = false;
          this.loadingService.hide();
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

