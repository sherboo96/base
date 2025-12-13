import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { InstitutionService } from '../../../../services/institution.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';
import { AttachmentService } from '../../../../services/attachment.service';

@Component({
  selector: 'app-institution-form',
  templateUrl: './institution-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class InstitutionFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  selectedFile: File | null = null;
  certificatePdfPath: string = '';
  isUploading = false;

  constructor(
    private fb: FormBuilder,
    private institutionService: InstitutionService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ institution?: any }>,
    private translationService: TranslationService,
    private attachmentService: AttachmentService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nameAr: ['', Validators.required],
      certificatePdf: [''],
    });

    if (this.dialogRef.data?.institution) {
      this.isEdit = true;
      const institution = this.dialogRef.data.institution;
      this.certificatePdfPath = institution.certificatePdf || '';
      this.form.patchValue({
        name: institution.name,
        nameAr: institution.nameAr || '',
        certificatePdf: institution.certificatePdf || '',
      });
    }
  }

  ngOnInit(): void {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        this.toastr.error('Please select a PDF file');
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.toastr.error('File size must be less than 10MB');
        return;
      }
      this.selectedFile = file;
      this.uploadFile();
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.attachmentService.uploadFile(this.selectedFile).subscribe({
      next: (filePath) => {
        this.certificatePdfPath = filePath;
        this.form.patchValue({ certificatePdf: filePath });
        this.toastr.success('Certificate PDF uploaded successfully');
        this.isUploading = false;
      },
      error: (error) => {
        this.toastr.error(error.error?.message || 'Failed to upload certificate PDF');
        this.isUploading = false;
        this.selectedFile = null;
      },
    });
  }

  removeFile(): void {
    if (this.certificatePdfPath) {
      this.attachmentService.deleteFile(this.certificatePdfPath).subscribe({
        next: () => {
          this.certificatePdfPath = '';
          this.form.patchValue({ certificatePdf: '' });
          this.selectedFile = null;
          this.toastr.success('Certificate PDF removed');
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Failed to remove certificate PDF');
        },
      });
    }
  }

  viewCertificate(): void {
    if (this.certificatePdfPath) {
      const url = this.attachmentService.getFileUrl(this.certificatePdfPath);
      window.open(url, '_blank');
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('institution.formInvalid'));
      return;
    }

    this.isSubmitting = true;
    const formData = this.form.value;

    if (this.isEdit) {
      const institutionId = this.dialogRef.data.institution.id;
      this.institutionService.updateInstitution(institutionId, formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('institution.updateSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('institution.updateError')
          );
          this.isSubmitting = false;
        },
      });
    } else {
      this.institutionService.createInstitution(formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('institution.createSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('institution.createError')
          );
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
