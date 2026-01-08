import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { AdoptionUserService } from '../../../../services/adoption-user.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-adoption-user-form',
  templateUrl: './adoption-user-form.component.html',
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
export class AdoptionUserFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  organizations: any[] = [];

  constructor(
    private fb: FormBuilder,
    private adoptionUserService: AdoptionUserService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ adoptionUser?: any; organizations?: any[] }>,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nameAr: [''],
      email: ['', [Validators.required, Validators.email]],
      bio: [''],
      organizationId: [null, Validators.required],
    });

    if (this.dialogRef.data?.adoptionUser) {
      this.isEdit = true;
      const adoptionUser = this.dialogRef.data.adoptionUser;
      this.form.patchValue({
        name: adoptionUser.name,
        nameAr: adoptionUser.nameAr || '',
        email: adoptionUser.email,
        bio: adoptionUser.bio || '',
        organizationId: adoptionUser.organizationId,
      });
    }

    if (this.dialogRef.data?.organizations) {
      this.organizations = this.dialogRef.data.organizations;
    }
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('adoptionUser.formInvalid'));
      return;
    }

    this.isSubmitting = true;
    const formData = { ...this.form.value };

    if (this.isEdit) {
      const adoptionUserId = this.dialogRef.data.adoptionUser.id;
      this.adoptionUserService.updateAdoptionUser(adoptionUserId, formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('adoptionUser.updateSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('adoptionUser.updateError')
          );
          this.isSubmitting = false;
        },
      });
    } else {
      this.adoptionUserService.createAdoptionUser(formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('adoptionUser.createSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('adoptionUser.createError')
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
