import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DepartmentService } from '../../../../services/department.service';
import { OrganizationService } from '../../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { DialogRef } from '@ngneat/dialog';
import { TranslationService } from '../../../../services/translation.service';

interface JsonDepartment {
  Id?: number;
  nameAr: string;
  nameEn: string;
  ParentDepartmentId?: number | null;
}

interface JsonUploadData {
  departments: JsonDepartment[];
}

@Component({
  selector: 'app-department-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './department-upload.component.html',
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
      background: #c9ae81;
      border-radius: 10px;
    }
    
    .form-scroll-container::-webkit-scrollbar-thumb:hover {
      background: #b89a6e;
    }
  `]
})
export class DepartmentUploadComponent implements OnInit {
  form: FormGroup;
  organizations: any[] = [];
  selectedFile: File | null = null;
  parsedDepartments: JsonDepartment[] = [];
  previewData: any[] = [];
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private dialogRef: DialogRef,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      organizationId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.organizationService.getOrganizations(1, 1000).subscribe({
      next: (response) => {
        // Filter to show only main organizations
        this.organizations = (response.result || []).filter((org: any) => org.isMain);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.toastr.error(this.translationService.instant('department.organizationsLoadError'));
      },
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      this.toastr.error(this.translationService.instant('department.uploadInvalidFileType'));
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
        this.toastr.error(this.translationService.instant('department.uploadInvalidJson'));
        this.selectedFile = null;
        this.parsedDepartments = [];
        this.previewData = [];
      }
      this.cdr.detectChanges();
    };

    reader.readAsText(file);
  }

  parseJsonFile(jsonContent: any): void {
    if (!jsonContent.departments || !Array.isArray(jsonContent.departments)) {
      this.toastr.error(this.translationService.instant('department.uploadInvalidJsonFormat'));
      this.selectedFile = null;
      this.parsedDepartments = [];
      this.previewData = [];
      return;
    }

    this.parsedDepartments = jsonContent.departments;
    this.previewData = this.parsedDepartments.map((dept, index) => ({
      index: index + 1,
      id: dept.Id || '-',
      nameEn: dept.nameEn || '-',
      nameAr: dept.nameAr || '-',
      parentDepartmentId: dept.ParentDepartmentId ?? '-',
    }));

    this.toastr.success(
      this.translationService.instant('department.uploadFileParsed', { count: this.parsedDepartments.length })
    );
  }

  removeFile(): void {
    this.selectedFile = null;
    this.parsedDepartments = [];
    this.previewData = [];
    const fileInput = document.getElementById('jsonFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.detectChanges();
  }

  removeDepartment(index: number): void {
    if (index >= 0 && index < this.parsedDepartments.length) {
      this.parsedDepartments.splice(index, 1);
      // Rebuild preview data with updated indices
      this.previewData = this.parsedDepartments.map((dept, idx) => ({
        index: idx + 1,
        id: dept.Id || '-',
        nameEn: dept.nameEn || '-',
        nameAr: dept.nameAr || '-',
        parentDepartmentId: dept.ParentDepartmentId ?? '-',
      }));
      this.toastr.info(
        this.translationService.instant('department.recordRemoved', { count: this.parsedDepartments.length })
      );
      this.cdr.detectChanges();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error(this.translationService.instant('department.uploadFormInvalid'));
      return;
    }

    if (this.parsedDepartments.length === 0) {
      this.toastr.error(this.translationService.instant('department.uploadNoDepartments'));
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    const formData = this.form.value;
    const departmentsToCreate = this.parsedDepartments.map((dept) => {
      // Generate code from English name if not provided
      const code = dept.nameEn
        ? dept.nameEn
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_')
            .substring(0, 50)
        : `DEPT_${Date.now()}`;

      return {
        nameEn: dept.nameEn || '',
        nameAr: dept.nameAr || '',
        code: code,
        type: 'Department', // Default type
        level: 'DepartmentHead', // Default level
        organizationId: formData.organizationId,
        parentDepartmentId: dept.ParentDepartmentId ?? null,
        originalId: dept.Id ?? undefined, // Keep original ID for parent mapping
      };
    });

    this.departmentService.uploadDepartments(departmentsToCreate).subscribe({
      next: (response) => {
        if (response && response.result) {
          const result = response.result;
          if (result.successCount > 0) {
            this.toastr.success(
              this.translationService.instant('department.uploadSuccess', { count: result.successCount })
            );
          }
          if (result.failureCount > 0) {
            this.toastr.warning(
              `${result.failureCount} ${this.translationService.instant('department.departments')} ${this.translationService.instant('department.uploadFailed')}`
            );
          }
        } else {
          this.toastr.success(
            this.translationService.instant('department.uploadSuccess', { count: departmentsToCreate.length })
          );
        }
        this.loadingService.hide();
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error uploading departments:', error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('department.uploadError')
        );
        this.isSubmitting = false;
        this.loadingService.hide();
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

