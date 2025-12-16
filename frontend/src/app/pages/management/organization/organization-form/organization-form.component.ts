import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { OrganizationService } from '../../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-organization-form',
  templateUrl: './organization-form.component.html',
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
export class OrganizationFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  loginMethods: any[] = [];

  constructor(
    private fb: FormBuilder,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ organization?: any }>,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nameAr: [''],
      code: ['', Validators.required],
      domain: ['', [Validators.required, this.domainValidator]],
      isMain: [false],
      defaultLoginMethod: [1, Validators.required], // Default to OTPVerification (1)
    });

    if (this.dialogRef.data?.organization) {
      this.isEdit = true;
      const defaultLoginMethod = this.dialogRef.data.organization.defaultLoginMethod;
      this.form.patchValue({
        name: this.dialogRef.data.organization.name || '',
        nameAr: this.dialogRef.data.organization.nameAr || '',
        code: this.dialogRef.data.organization.code || '',
        domain: this.dialogRef.data.organization.domain || '',
        isMain: this.dialogRef.data.organization.isMain || false,
        defaultLoginMethod: defaultLoginMethod ? (typeof defaultLoginMethod === 'number' ? defaultLoginMethod : parseInt(defaultLoginMethod.toString())) : 1,
      });
    }
  }

  ngOnInit(): void {
    this.loadLoginMethods();
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  loadLoginMethods(): void {
    // Load all available login methods
    this.loginMethods = [
      { id: 1, name: 'OTP Verification' },
      { id: 2, name: 'Active Directory' },
      { id: 3, name: 'Credentials' }
    ];
  }

  domainValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!domainPattern.test(control.value)) {
      return { invalidDomain: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.form.value;
    
    // Ensure all required fields are included
    // Convert defaultLoginMethod to number (HTML select returns string)
    const defaultLoginMethodValue = typeof formData.defaultLoginMethod === 'string' 
      ? parseInt(formData.defaultLoginMethod) 
      : (formData.defaultLoginMethod || 1);
    
    const payload = {
      name: formData.name,
      nameAr: formData.nameAr || '',
      code: formData.code,
      domain: formData.domain,
      isMain: formData.isMain || false,
      defaultLoginMethod: defaultLoginMethodValue,
    };

    if (this.isEdit) {
      this.organizationService
        .updateOrganization(this.dialogRef.data.organization.id, payload)
        .subscribe({
          next: () => {
            this.toastr.success('Organization updated successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.toastr.error(error.error?.message || 'Failed to update organization');
            console.error('Error updating organization:', error);
            this.isSubmitting = false;
          },
        });
    } else {
      this.organizationService.createOrganization(payload).subscribe({
        next: () => {
          this.toastr.success('Organization created successfully');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Failed to create organization');
          console.error('Error creating organization:', error);
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

