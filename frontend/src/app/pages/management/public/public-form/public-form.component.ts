import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { PublicService, Public } from '../../../../services/public.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-public-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="p-4">
      <div class="mb-4">
        <h3 class="text-xl font-bold text-gray-900 mb-1 font-poppins">
          {{ dialogRef.data.publicData ? ('public.editPublic' | translate) : ('public.addPublic' | translate) }}
        </h3>
      </div>

      <form [formGroup]="publicForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Key Input -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1 font-poppins">
            {{ 'public.key' | translate }} <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            formControlName="key"
            [readonly]="!!dialogRef.data.publicData"
            [class.readonly]="!!dialogRef.data.publicData"
            class="w-full border-2 border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 bg-white"
            [class.border-red-500]="publicForm.get('key')?.invalid && publicForm.get('key')?.touched"
          />
          <p *ngIf="publicForm.get('key')?.invalid && publicForm.get('key')?.touched" class="text-xs text-red-500 mt-1">
            {{ 'public.keyRequired' | translate }}
          </p>
        </div>

        <!-- Value Input (JSON) -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1 font-poppins">
            {{ 'public.value' | translate }} <span class="text-red-500">*</span>
          </label>
          <textarea
            formControlName="value"
            rows="6"
            class="w-full border-2 border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 bg-white resize-none font-mono"
            [class.border-red-500]="publicForm.get('value')?.invalid && publicForm.get('value')?.touched"
            placeholder='{"key": "value"}'
          ></textarea>
          <p *ngIf="publicForm.get('value')?.invalid && publicForm.get('value')?.touched" class="text-xs text-red-500 mt-1">
            {{ 'public.valueRequired' | translate }}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            {{ 'public.valueHint' | translate }}
          </p>
        </div>

        <!-- Description Input -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1 font-poppins">
            {{ 'public.description' | translate }}
          </label>
          <textarea
            formControlName="description"
            rows="3"
            class="w-full border-2 border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 bg-white resize-none"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-4">
          <button
            type="button"
            (click)="dialogRef.close(false)"
            class="px-4 py-2 border-2 border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
          >
            {{ 'common.cancel' | translate }}
          </button>
          <button
            type="submit"
            [disabled]="publicForm.invalid"
            class="px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accentDark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ 'common.save' | translate }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .readonly {
      background-color: #f3f4f6;
      cursor: not-allowed;
    }
  `],
})
export class PublicFormComponent implements OnInit {
  publicForm!: FormGroup;

  constructor(
    public dialogRef: DialogRef<{ publicData?: Public }>,
    private fb: FormBuilder,
    private publicService: PublicService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const publicData = this.dialogRef.data?.publicData;
    
    this.publicForm = this.fb.group({
      key: [publicData?.key || '', [Validators.required]],
      value: [publicData?.value || '', [Validators.required]],
      description: [publicData?.description || ''],
    });
  }

  onSubmit(): void {
    if (this.publicForm.invalid) {
      this.publicForm.markAllAsTouched();
      return;
    }

    // Validate JSON if value is provided
    const formValue = this.publicForm.value;
    if (formValue.value) {
      try {
        JSON.parse(formValue.value);
      } catch (e) {
        this.toastr.error(this.translationService.instant('public.invalidJson'));
        return;
      }
    }

    const publicData: Public = {
      key: formValue.key,
      value: formValue.value,
      description: formValue.description,
    };

    this.loadingService.show();
    this.publicService.createOrUpdate(publicData).subscribe({
      next: () => {
        this.toastr.success(this.translationService.instant('public.saveSuccess'));
        this.loadingService.hide();
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.toastr.error(error.error?.message || this.translationService.instant('public.saveError'));
        this.loadingService.hide();
      },
    });
  }
}

