import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { SystemConfigurationService, SystemConfiguration } from '../../../../services/system-configuration.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-system-configuration-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="p-4">
      <div class="mb-4">
        <h3 class="text-xl font-bold text-gray-900 mb-1 font-poppins">
          {{ dialogRef.data.configuration ? ('systemConfig.editConfiguration' | translate) : ('systemConfig.addConfiguration' | translate) }}
        </h3>
      </div>

      <form [formGroup]="configForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Key Input -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1 font-poppins">
            {{ 'systemConfig.key' | translate }} <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            formControlName="key"
            [readonly]="!!dialogRef.data.configuration"
            [class.readonly]="!!dialogRef.data.configuration"
            class="w-full border-2 border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 bg-white"
            [class.border-red-500]="configForm.get('key')?.invalid && configForm.get('key')?.touched"
          />
          <p *ngIf="configForm.get('key')?.invalid && configForm.get('key')?.touched" class="text-xs text-red-500 mt-1">
            {{ 'systemConfig.keyRequired' | translate }}
          </p>
        </div>

        <!-- Value Input -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1 font-poppins">
            {{ 'systemConfig.value' | translate }} <span class="text-red-500">*</span>
          </label>
          <input
            [type]="isPasswordField() ? 'password' : 'text'"
            formControlName="value"
            class="w-full border-2 border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 bg-white"
            [class.border-red-500]="configForm.get('value')?.invalid && configForm.get('value')?.touched"
            [placeholder]="isPasswordField() ? ('systemConfig.passwordPlaceholder' | translate) : ''"
          />
          <p *ngIf="configForm.get('value')?.invalid && configForm.get('value')?.touched && !isPasswordField()" class="text-xs text-red-500 mt-1">
            {{ 'systemConfig.valueRequired' | translate }}
          </p>
          <p *ngIf="isPasswordField()" class="text-xs text-gray-500 mt-1">
            {{ 'systemConfig.passwordHint' | translate }}
          </p>
        </div>

        <!-- Description Input -->
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1 font-poppins">
            {{ 'systemConfig.description' | translate }}
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
            [disabled]="configForm.invalid"
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
export class SystemConfigurationFormComponent implements OnInit {
  configForm!: FormGroup;

  constructor(
    public dialogRef: DialogRef<{ configuration?: SystemConfiguration }>,
    private fb: FormBuilder,
    private configService: SystemConfigurationService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const config = this.dialogRef.data?.configuration;
    // If editing password field with masked value, clear it so user can enter new password
    let initialValue = config?.value || '';
    if (config && this.isPasswordField(config.key) && initialValue && initialValue.includes('*')) {
      initialValue = ''; // Clear masked password
    }
    
    this.configForm = this.fb.group({
      key: [config?.key || '', [Validators.required]],
      value: [initialValue, this.isPasswordField(config?.key) ? [] : [Validators.required]],
      description: [config?.description || ''],
    });
  }

  isPasswordField(key?: string): boolean {
    const fieldKey = key || this.configForm?.get('key')?.value || '';
    return fieldKey.toLowerCase().includes('password');
  }

  onSubmit(): void {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      return;
    }

    const formValue = this.configForm.value;
    // If password field and value is empty, skip update (keep existing)
    if (this.isPasswordField(formValue.key) && !formValue.value) {
      this.toastr.warning(this.translationService.instant('systemConfig.passwordNotChanged'));
      this.dialogRef.close(false);
      return;
    }

    const config: SystemConfiguration = {
      key: formValue.key,
      value: formValue.value,
      description: formValue.description,
    };

    this.loadingService.show();
    const existingConfig = this.dialogRef.data?.configuration;

    if (existingConfig) {
      // Update
      this.configService.update(existingConfig.key, config).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('systemConfig.updateSuccess'));
          this.loadingService.hide();
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(error.error?.message || this.translationService.instant('systemConfig.updateError'));
          this.loadingService.hide();
        },
      });
    } else {
      // Create
      this.configService.create(config).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('systemConfig.createSuccess'));
          this.loadingService.hide();
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(error.error?.message || this.translationService.instant('systemConfig.createError'));
          this.loadingService.hide();
        },
      });
    }
  }
}
