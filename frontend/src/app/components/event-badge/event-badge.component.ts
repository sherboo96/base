import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { EventRegistrationService } from '../../services/event-registration.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-event-badge',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="p-8 max-h-[90vh] overflow-y-auto">
      <!-- Badge Container -->
      <div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
        <div class="relative" [style.min-height.px]="badgeImageUrl ? 'auto' : '400'">
          <!-- Loading State -->
          <div *ngIf="isLoading" class="flex flex-col items-center justify-center min-h-[400px]">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p class="text-gray-600 font-poppins">{{ 'common.loading' | translate }}</p>
          </div>

          <!-- Badge Image from Backend -->
          <img
            *ngIf="badgeImageUrl"
            [src]="badgeImageUrl"
            alt="Event Badge"
            class="w-full h-auto object-contain"
            (load)="onImageLoad()"
            (error)="onImageError()"
          />

          <!-- Error State -->
          <div *ngIf="hasError && !isLoading" class="flex flex-col items-center justify-center min-h-[400px] text-center">
            <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
            <p class="text-gray-700 font-poppins">{{ 'eventRegistration.badgeError' | translate }}</p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-center gap-3 pt-6 mt-6 border-t border-gray-200">
        <button
          type="button"
          (click)="downloadBadge()"
          [disabled]="isDownloading || isLoading || hasError || !badgeImageUrl"
          class="px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accentDark transition-all duration-200 shadow-md hover:shadow-lg font-medium font-poppins disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i class="fas fa-download mr-2"></i>
          <span *ngIf="!isDownloading">{{ 'eventRegistration.downloadBadge' | translate }}</span>
          <span *ngIf="isDownloading">{{ 'common.downloading' | translate }}</span>
        </button>
        <button
          type="button"
          (click)="onClose()"
          class="px-6 py-2.5 bg-accentDark text-white rounded-lg hover:bg-accentDarker transition-all duration-200 shadow-md hover:shadow-lg font-medium font-poppins"
        >
          {{ 'common.close' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EventBadgeComponent implements OnInit {
  badgeImageUrl: string = '';
  isLoading = true;
  isDownloading = false;
  hasError = false;
  registrationId?: number;
  barcode?: string;
  registrationName: string = '';

  constructor(
    public dialogRef: DialogRef<{ registrationId?: number; barcode?: string; name: string }>,
    private eventRegistrationService: EventRegistrationService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.dialogRef.data) {
      this.registrationId = this.dialogRef.data.registrationId;
      this.barcode = this.dialogRef.data.barcode;
      this.registrationName = this.dialogRef.data.name || '';
      this.loadBadge();
    }
  }

  loadBadge(): void {
    this.isLoading = true;
    this.hasError = false;

    const badgeObservable = this.registrationId
      ? this.eventRegistrationService.getBadgeById(this.registrationId)
      : this.barcode
      ? this.eventRegistrationService.getBadgeByBarcode(this.barcode)
      : null;

    if (!badgeObservable) {
      this.hasError = true;
      this.isLoading = false;
      this.toastr.error(this.translationService.instant('eventRegistration.badgeError'));
      return;
    }

    badgeObservable.subscribe({
      next: (blob: Blob) => {
        if (blob && blob.size > 0) {
          const url = URL.createObjectURL(blob);
          this.badgeImageUrl = url;
          // Set loading to false immediately - blob is ready and image will display
          this.isLoading = false;
          this.hasError = false;
          this.cdr.detectChanges();
        } else {
          this.hasError = true;
          this.isLoading = false;
          this.cdr.detectChanges();
          this.toastr.error(this.translationService.instant('eventRegistration.badgeError'));
        }
      },
      error: (error) => {
        console.error('Error loading badge:', error);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.toastr.error(
          error.error?.message || this.translationService.instant('eventRegistration.badgeError')
        );
      },
    });
  }

  onClose(): void {
    // Clean up object URL
    if (this.badgeImageUrl && this.badgeImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.badgeImageUrl);
    }
    this.dialogRef.close();
  }

  onImageLoad(): void {
    // Image loaded successfully - ensure loading is off
    if (this.isLoading) {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
    this.hasError = false;
  }

  onImageError(): void {
    this.hasError = true;
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  downloadBadge(): void {
    if (!this.badgeImageUrl || this.isDownloading || this.hasError) {
      return;
    }

    this.isDownloading = true;

    // Fetch the badge again to get fresh blob for download
    const badgeObservable = this.registrationId
      ? this.eventRegistrationService.getBadgeById(this.registrationId)
      : this.barcode
      ? this.eventRegistrationService.getBadgeByBarcode(this.barcode)
      : null;

    if (!badgeObservable) {
      this.isDownloading = false;
      return;
    }

    badgeObservable.subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `badge-${this.barcode || this.registrationId}-${this.registrationName.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.isDownloading = false;
        this.toastr.success(this.translationService.instant('eventRegistration.badgeDownloaded'));
      },
      error: (error) => {
        console.error('Error downloading badge:', error);
        this.isDownloading = false;
        this.toastr.error(
          error.error?.message || this.translationService.instant('eventRegistration.badgeDownloadError')
        );
      },
    });
  }
}

