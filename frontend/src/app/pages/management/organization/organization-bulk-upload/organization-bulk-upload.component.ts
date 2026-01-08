import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { OrganizationService, BulkOrganizationUpload } from '../../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';
import { LoadingService } from '../../../../services/loading.service';

interface PreviewOrganization {
  index: number;
  nameEn: string;
  nameAr: string;
  code: string;
  domain: string;
}

@Component({
  selector: 'app-organization-bulk-upload',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './organization-bulk-upload.component.html',
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
export class OrganizationBulkUploadComponent {
  selectedFile: File | null = null;
  parsedOrganizations: BulkOrganizationUpload[] = [];
  previewData: PreviewOrganization[] = [];
  isUploading = false;

  constructor(
    private dialogRef: DialogRef,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      this.toastr.error(this.translationService.instant('organization.invalidFileType'));
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
        this.toastr.error(this.translationService.instant('organization.bulkUploadParseError'));
        this.selectedFile = null;
        this.parsedOrganizations = [];
        this.previewData = [];
      }
      this.cdr.detectChanges();
    };

    reader.readAsText(file);
  }

  parseJsonFile(jsonContent: any): void {
    // Handle both single object and array
    let organizations: any[] = [];
    if (Array.isArray(jsonContent)) {
      organizations = jsonContent;
    } else {
      // Single object, wrap in array
      organizations = [jsonContent];
    }

    // Transform the data to match the backend DTO format (camelCase)
    // Backend expects: NameEn, NameAr, Code, Domain (PascalCase in C#, camelCase in JSON)
    const transformedOrgs: BulkOrganizationUpload[] = organizations.map((org: any) => ({
      nameEn: org.name_en || org.nameEn || org.name || '',
      nameAr: org.name_ar || org.nameAr || '',
      code: org.code || '',
      domain: org.domain || ''
    }));

    // Filter to only valid organizations (have all required fields)
    this.parsedOrganizations = transformedOrgs.filter(org => 
      org.nameEn && org.code && org.domain
    );

    // Build preview data
    this.previewData = this.parsedOrganizations.map((org, index) => ({
      index: index + 1,
      nameEn: org.nameEn || '-',
      nameAr: org.nameAr || '-',
      code: org.code || '-',
      domain: org.domain || '-',
    }));

    if (this.parsedOrganizations.length > 0) {
      this.toastr.success(
        this.translationService.instant('organization.uploadFileParsed', { count: this.parsedOrganizations.length })
      );
    } else {
      this.toastr.error(this.translationService.instant('organization.bulkUploadInvalidData'));
      this.selectedFile = null;
      this.parsedOrganizations = [];
      this.previewData = [];
    }

    this.cdr.detectChanges();
  }

  removeFile(): void {
    this.selectedFile = null;
    this.parsedOrganizations = [];
    this.previewData = [];
    const fileInput = document.getElementById('jsonFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.cdr.detectChanges();
  }

  removeOrganization(index: number): void {
    if (index >= 0 && index < this.parsedOrganizations.length) {
      this.parsedOrganizations.splice(index, 1);
      // Rebuild preview data with updated indices
      this.previewData = this.parsedOrganizations.map((org, idx) => ({
        index: idx + 1,
        nameEn: org.nameEn || '-',
        nameAr: org.nameAr || '-',
        code: org.code || '-',
        domain: org.domain || '-',
      }));
      this.toastr.info(
        this.translationService.instant('organization.recordRemoved', { count: this.parsedOrganizations.length })
      );
      this.cdr.detectChanges();
    }
  }

  onSubmit(): void {
    if (this.parsedOrganizations.length === 0) {
      this.toastr.error(this.translationService.instant('organization.bulkUploadInvalidData'));
      return;
    }

    this.isUploading = true;
    this.loadingService.show();

    this.uploadOrganizations(this.parsedOrganizations);
  }

  uploadOrganizations(organizations: BulkOrganizationUpload[]): void {
    this.organizationService.bulkUploadOrganizations(organizations).subscribe({
      next: (response: any) => {
        const result = response.result || response;
        this.isUploading = false;
        this.loadingService.hide();
        
        if (result && result.successfullyAdded > 0) {
          this.toastr.success(
            this.translationService.instant('organization.uploadSuccess', { count: result.successfullyAdded })
          );
        }
        if (result && result.skipped > 0) {
          this.toastr.warning(
            `${result.skipped} ${this.translationService.instant('organization.organizations')} ${this.translationService.instant('organization.uploadSkipped')}`
          );
        }
        if (result && result.errors && result.errors.length > 0) {
          this.toastr.warning(
            `${result.errors.length} ${this.translationService.instant('organization.organizations')} ${this.translationService.instant('organization.uploadFailed')}`
          );
        }

        this.dialogRef.close(true);
      },
      error: (error: any) => {
        console.error('Error uploading organizations:', error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('organization.bulkUploadError')
        );
        this.isUploading = false;
        this.loadingService.hide();
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
