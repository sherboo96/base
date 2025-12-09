import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="p-6 max-w-md mx-auto font-poppins">
      <div class="flex flex-col items-center text-center">
        <!-- Success Icon -->
        <div class="mb-4">
          <div class="flex items-center justify-center h-16 w-16 rounded-full bg-green-50 mx-auto shadow-lg">
            <i class="fas fa-check-circle text-green-600 text-3xl"></i>
          </div>
        </div>

        <!-- Title -->
        <h3 class="text-xl font-bold text-gray-900 mb-2 font-poppins">
          {{ 'user.passwordResetSuccess' | translate }}
        </h3>
        
        <!-- Message -->
        <p class="text-sm text-gray-600 mb-4 font-poppins">
          {{ 'user.newPasswordGenerated' | translate }}
        </p>

        <!-- Password Display Box -->
        <div class="w-full bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-4">
          <label class="block text-xs font-medium text-gray-700 mb-2 font-poppins">
            {{ 'user.temporaryPassword' | translate }}
          </label>
          <div class="flex items-center justify-between bg-white border border-gray-300 rounded-lg px-4 py-3">
            <code class="text-lg font-mono font-bold text-gray-900 select-all flex-1 text-left">{{ dialogRef.data.password }}</code>
            <button
              type="button"
              (click)="copyPassword()"
              class="ml-3 px-3 py-1.5 text-xs font-medium text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors duration-200 whitespace-nowrap"
              [title]="'user.copyPassword' | translate"
            >
              <i class="fas fa-copy mr-1"></i>
              {{ 'user.copy' | translate }}
            </button>
          </div>
        </div>

        <!-- Warning Message -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 w-full">
          <p class="text-xs text-yellow-700 flex items-start justify-center font-poppins">
            <i class="fas fa-exclamation-circle mr-2 mt-0.5"></i>
            <span>{{ 'user.passwordResetWarning' | translate }}</span>
          </p>
        </div>

        <!-- Action Button -->
        <div class="flex justify-center pt-2">
          <button
            type="button"
            (click)="dialogRef.close(true)"
            class="px-6 py-2.5 bg-accent hover:bg-accentDark text-white rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-200 shadow-sm hover:shadow-md font-poppins"
          >
            {{ 'common.close' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class ResetPasswordDialogComponent {
  constructor(
    public dialogRef: DialogRef<{
      password: string;
    }>,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  copyPassword(): void {
    const password = this.dialogRef.data.password;
    const successMessage = this.translate.instant('user.passwordCopied') || 'Password copied to clipboard';
    navigator.clipboard.writeText(password).then(() => {
      this.toastr.success(successMessage);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = password;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.toastr.success(successMessage);
    });
  }
}
