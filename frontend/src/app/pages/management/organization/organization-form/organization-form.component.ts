import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { OrganizationService } from '../../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-organization-form',
  templateUrl: './organization-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
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

  constructor(
    private fb: FormBuilder,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ organization?: any }>
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
    });

    if (this.dialogRef.data?.organization) {
      this.isEdit = true;
      this.form.patchValue(this.dialogRef.data.organization);
    }
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.isSubmitting = true;
    const formData = this.form.value;

    if (this.isEdit) {
      this.organizationService
        .updateOrganization(this.dialogRef.data.organization.id, formData)
        .subscribe({
          next: () => {
            this.toastr.success('Organization updated successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.toastr.error('Failed to update organization');
            console.error('Error updating organization:', error);
            this.isSubmitting = false;
          },
        });
    } else {
      this.organizationService.createOrganization(formData).subscribe({
        next: () => {
          this.toastr.success('Organization created successfully');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error('Failed to create organization');
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
