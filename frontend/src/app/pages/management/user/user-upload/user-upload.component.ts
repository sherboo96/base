import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from '../../../../services/user.service';
import { OrganizationService } from '../../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { DialogRef } from '@ngneat/dialog';
import { TranslationService } from '../../../../services/translation.service';

interface JsonUser {
  UserArabicName: string;
  UserEnglishName: string;
  UserADName: string;
  CivilID: number;
  DOB: string;
  Phone: number;
  Gender: string;
}

interface JsonUploadData {
  data: JsonUser[];
}

@Component({
  selector: 'app-user-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './user-upload.component.html',
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
export class UserUploadComponent implements OnInit {
  form: FormGroup;
  organizations: any[] = [];
  loginMethods: any[] = [];
  selectedFile: File | null = null;
  parsedUsers: JsonUser[] = [];
  previewData: any[] = [];
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private dialogRef: DialogRef,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      organizationId: ['', Validators.required],
      loginMethod: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadLoginMethods();
  }

  loadOrganizations(): void {
    this.organizationService.getOrganizations(1, 1000).subscribe({
      next: (response) => {
        this.organizations = response.result || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.toastr.error(this.translationService.instant('user.organizationsLoadError'));
      },
    });
  }

  loadLoginMethods(): void {
    this.loginMethods = [
      { id: 1, name: 'OTPVerification', displayName: 'OTP Verification' },
      { id: 2, name: 'ActiveDirectory', displayName: 'Active Directory' },
      { id: 3, name: 'Credentials', displayName: 'Credentials (Username/Password)' },
    ];
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      this.toastr.error(this.translationService.instant('user.uploadInvalidFileType'));
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
        this.toastr.error(this.translationService.instant('user.uploadInvalidJson'));
        this.selectedFile = null;
        this.parsedUsers = [];
        this.previewData = [];
      }
      this.cdr.detectChanges();
    };

    reader.readAsText(file);
  }

  parseJsonFile(jsonContent: any): void {
    if (!jsonContent.data || !Array.isArray(jsonContent.data)) {
      this.toastr.error(this.translationService.instant('user.uploadInvalidJsonFormat'));
      this.selectedFile = null;
      this.parsedUsers = [];
      this.previewData = [];
      return;
    }

    this.parsedUsers = jsonContent.data;
    this.previewData = this.parsedUsers.map((user, index) => ({
      index: index + 1,
      arabicName: user.UserArabicName || '-',
      englishName: user.UserEnglishName || '-',
      adUsername: user.UserADName || '-',
      civilId: user.CivilID || '-',
      dob: user.DOB || '-',
      phone: user.Phone || '-',
      gender: user.Gender || '-',
    }));

    this.toastr.success(
      this.translationService.instant('user.uploadFileParsed', { count: this.parsedUsers.length })
    );
  }

  removeFile(): void {
    this.selectedFile = null;
    this.parsedUsers = [];
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
      this.toastr.error(this.translationService.instant('user.uploadFormInvalid'));
      return;
    }

    if (this.parsedUsers.length === 0) {
      this.toastr.error(this.translationService.instant('user.uploadNoUsers'));
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    const formData = this.form.value;
    const usersToCreate = this.parsedUsers.map((user) => {
      // Extract email from AD username if available (format: domain\username -> username@domain)
      let email = '';
      if (user.UserADName && user.UserADName.includes('\\')) {
        const parts = user.UserADName.split('\\');
        if (parts.length === 2) {
          // Extract domain and username
          const domain = parts[0].toLowerCase();
          const username = parts[1].toLowerCase();
          // Generate email based on domain
          if (domain === 'moil') {
            email = `${username}@moil.gov.kw`;
          } else {
            email = `${username}@${domain}.kw`;
          }
        }
      } else if (user.UserADName) {
        email = `${user.UserADName.toLowerCase()}@moil.gov.kw`; // Default email domain
      } else {
        // Generate email from English name if no AD username
        const nameParts = (user.UserEnglishName || user.UserArabicName || '').toLowerCase().split(' ').filter(p => p.length > 0);
        if (nameParts.length > 0) {
          email = nameParts.join('.') + '@moil.gov.kw';
        } else {
          // Fallback: use civil ID
          email = `user${user.CivilID}@moil.gov.kw`;
        }
      }

      return {
        fullName: user.UserEnglishName || user.UserArabicName || '',
        email: email,
        adUsername: user.UserADName || '',
        civilNo: user.CivilID?.toString() || '',
        organizationId: formData.organizationId,
        loginMethod: formData.loginMethod,
      };
    });

    this.userService.uploadUsers(usersToCreate).subscribe({
      next: (response) => {
        if (response && response.result) {
          const result = response.result;
          if (result.successCount > 0) {
            this.toastr.success(
              this.translationService.instant('user.uploadSuccess', { count: result.successCount })
            );
          }
          if (result.failureCount > 0) {
            this.toastr.warning(
              `${result.failureCount} ${this.translationService.instant('user.users')} ${this.translationService.instant('user.uploadFailed')}`
            );
          }
        } else {
          this.toastr.success(
            this.translationService.instant('user.uploadSuccess', { count: usersToCreate.length })
          );
        }
        this.loadingService.hide();
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error uploading users:', error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('user.uploadError')
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

