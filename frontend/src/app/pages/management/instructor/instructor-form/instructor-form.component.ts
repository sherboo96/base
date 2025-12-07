import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { InstructorService } from '../../../../services/instructor.service';
import { AttachmentService } from '../../../../services/attachment.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-instructor-form',
  templateUrl: './instructor-form.component.html',
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
export class InstructorFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  institutions: any[] = [];
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  baseUrl = environment.baseUrl;

  constructor(
    private fb: FormBuilder,
    private instructorService: InstructorService,
    private attachmentService: AttachmentService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ instructor?: any; institutions?: any[] }>,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      nameEn: ['', Validators.required],
      nameAr: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      bio: [''],
      profileImage: [''],
      institutionId: [null, Validators.required],
    });

    if (this.dialogRef.data?.instructor) {
      this.isEdit = true;
      const instructor = this.dialogRef.data.instructor;
      this.form.patchValue({
        nameEn: instructor.nameEn,
        nameAr: instructor.nameAr || '',
        email: instructor.email,
        phone: instructor.phone || '',
        bio: instructor.bio || '',
        profileImage: instructor.profileImage || '',
        institutionId: instructor.institutionId,
      });
      
      if (instructor.profileImage) {
        this.imagePreview = this.attachmentService.getFileUrl(instructor.profileImage);
      }
    }

    if (this.dialogRef.data?.institutions) {
      this.institutions = this.dialogRef.data.institutions;
    }
  }

  ngOnInit(): void {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.form.patchValue({ profileImage: '' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('instructor.formInvalid'));
      return;
    }

    this.isSubmitting = true;

    // First upload image if selected
    const uploadPromise = this.selectedFile
      ? this.attachmentService.uploadFile(this.selectedFile).toPromise()
      : Promise.resolve(this.form.value.profileImage || null);

    uploadPromise
      .then((imagePath) => {
        const formData = {
          ...this.form.value,
          profileImage: imagePath || this.form.value.profileImage || null,
        };

        if (this.isEdit) {
          const instructorId = this.dialogRef.data.instructor.id;
          this.instructorService.updateInstructor(instructorId, formData).subscribe({
            next: () => {
              this.toastr.success(this.translationService.instant('instructor.updateSuccess'));
              this.dialogRef.close(true);
            },
            error: (error) => {
              this.toastr.error(
                error.error?.message || this.translationService.instant('instructor.updateError')
              );
              this.isSubmitting = false;
            },
          });
        } else {
          this.instructorService.createInstructor(formData).subscribe({
            next: () => {
              this.toastr.success(this.translationService.instant('instructor.createSuccess'));
              this.dialogRef.close(true);
            },
            error: (error) => {
              this.toastr.error(
                error.error?.message || this.translationService.instant('instructor.createError')
              );
              this.isSubmitting = false;
            },
          });
        }
      })
      .catch((error) => {
        this.toastr.error(
          error.error?.message || this.translationService.instant('instructor.uploadError')
        );
        this.isSubmitting = false;
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
