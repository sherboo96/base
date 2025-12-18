import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { JobTitleService } from '../../../../services/job-title.service';
import { DepartmentService } from '../../../../services/department.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { DialogRef } from '@ngneat/dialog';
import { TranslationService } from '../../../../services/translation.service';

interface JsonJobTitle {
  Id?: number;
  nameAr: string;
  nameEn: string;
  code?: string;
  description?: string;
  DepartmentId?: number;
}

interface JsonUploadData {
  jobTitles: JsonJobTitle[];
}

@Component({
  selector: 'app-job-title-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './job-title-upload.component.html',
  styles: [`
    :host {
      display: block;
      max-height: 90vh;
      overflow: hidden;
    }
    
    .form-scroll-container::-webkit-scrollbar {
      width: 8px;
    }
    
    .form-scroll-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .form-scroll-container::-webkit-scrollbar-thumb {
      background: #9333ea;
      border-radius: 10px;
    }
    
    .form-scroll-container::-webkit-scrollbar-thumb:hover {
      background: #7e22ce;
    }
  `]
})
export class JobTitleUploadComponent implements OnInit {
  form: FormGroup;
  departments: any[] = [];
  selectedFile: File | null = null;
  parsedJobTitles: JsonJobTitle[] = [];
  previewData: any[] = [];
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private jobTitleService: JobTitleService,
    private departmentService: DepartmentService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private dialogRef: DialogRef,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      departmentId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (response: any) => {
        const departments = response.result || response || [];
        this.departments = departments.filter((d: any) => !d.isDeleted);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.toastr.error(this.translationService.instant('jobTitle.departmentsLoadError'));
      },
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      this.toastr.error(this.translationService.instant('jobTitle.uploadInvalidFileType'));
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const jsonContent = JSON.parse(e.target.result);
        this.parseJsonFile(jsonContent);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        this.toastr.error(this.translationService.instant('jobTitle.uploadInvalidJson'));
        this.selectedFile = null;
        this.parsedJobTitles = [];
        this.previewData = [];
      }
      this.cdr.detectChanges();
    };

    reader.readAsText(file);
  }

  parseJsonFile(jsonContent: any): void {
    // Support both { jobTitles: [...] } and direct array
    let jobTitlesArray: JsonJobTitle[] = [];
    
    if (Array.isArray(jsonContent)) {
      jobTitlesArray = jsonContent;
    } else if (jsonContent.jobTitles && Array.isArray(jsonContent.jobTitles)) {
      jobTitlesArray = jsonContent.jobTitles;
    } else {
      this.toastr.error(this.translationService.instant('jobTitle.uploadInvalidJsonFormat'));
      this.selectedFile = null;
      this.parsedJobTitles = [];
      this.previewData = [];
      return;
    }

    this.parsedJobTitles = jobTitlesArray;
    this.previewData = this.parsedJobTitles.map((jt, index) => ({
      index: index + 1,
      id: jt.Id || '-',
      nameEn: jt.nameEn || '-',
      nameAr: jt.nameAr || '-',
      code: jt.code || '-',
      description: jt.description || '-',
      departmentId: jt.DepartmentId ?? '-',
    }));

    this.toastr.success(
      this.translationService.instant('jobTitle.uploadFileParsed', { count: this.parsedJobTitles.length })
    );
  }

  removeFile(): void {
    this.selectedFile = null;
    this.parsedJobTitles = [];
    this.previewData = [];
    const fileInput = document.getElementById('jsonFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error(this.translationService.instant('jobTitle.uploadFormInvalid'));
      return;
    }

    if (this.parsedJobTitles.length === 0) {
      this.toastr.error(this.translationService.instant('jobTitle.uploadNoJobTitles'));
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    const formData = this.form.value;
    const jobTitlesToCreate = this.parsedJobTitles.map((jt) => {
      return {
        nameEn: jt.nameEn || '',
        nameAr: jt.nameAr || '',
        code: jt.code || '',
        description: jt.description || '',
        departmentId: formData.departmentId,
      };
    });

    // Upload job titles one by one (or batch if API supports it)
    let successCount = 0;
    let failureCount = 0;
    const total = jobTitlesToCreate.length;
    let completed = 0;

    jobTitlesToCreate.forEach((jobTitle) => {
      this.jobTitleService.createJobTitle(jobTitle).subscribe({
        next: () => {
          successCount++;
          completed++;
          if (completed === total) {
            this.loadingService.hide();
            if (successCount > 0) {
              this.toastr.success(
                this.translationService.instant('jobTitle.uploadSuccess', { count: successCount })
              );
            }
            if (failureCount > 0) {
              this.toastr.warning(
                `${failureCount} ${this.translationService.instant('jobTitle.jobTitles')} ${this.translationService.instant('jobTitle.uploadFailed')}`
              );
            }
            this.dialogRef.close(true);
          }
        },
        error: (error) => {
          console.error('Error creating job title:', error);
          failureCount++;
          completed++;
          if (completed === total) {
            this.loadingService.hide();
            if (successCount > 0) {
              this.toastr.success(
                this.translationService.instant('jobTitle.uploadSuccess', { count: successCount })
              );
            }
            if (failureCount > 0) {
              this.toastr.warning(
                `${failureCount} ${this.translationService.instant('jobTitle.jobTitles')} ${this.translationService.instant('jobTitle.uploadFailed')}`
              );
            }
            this.dialogRef.close(true);
          }
        },
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

