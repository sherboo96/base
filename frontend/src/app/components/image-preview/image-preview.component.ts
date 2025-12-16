import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-image-preview',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="relative inline-block">
      <!-- Close Button (floating) -->
      <button
        (click)="onClose()"
        class="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200"
        [title]="'common.close' | translate"
      >
        <i class="fas fa-times text-lg"></i>
      </button>

      <!-- Image -->
      <img
        [src]="imageUrl"
        [alt]="title || ('common.imagePreview' | translate)"
        [class]="isBadge ? 'max-w-md max-h-md w-auto h-auto object-contain' : 'max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain'"
        (error)="onImageError()"
        (load)="onImageLoad()"
      />
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      background: transparent;
    }
  `]
})
export class ImagePreviewComponent {
  imageUrl: string = '';
  title: string = '';
  isBadge: boolean = false;

  constructor(
    public dialogRef: DialogRef<{ imageUrl: string; title?: string; isBadge?: boolean }>
  ) {
    if (this.dialogRef.data) {
      this.imageUrl = this.dialogRef.data.imageUrl || '';
      this.title = this.dialogRef.data.title || '';
      this.isBadge = this.dialogRef.data.isBadge || false;
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onImageError(): void {
    // Image failed to load - could show error message
    console.error('Failed to load image:', this.imageUrl);
  }

  onImageLoad(): void {
    // Image loaded successfully
  }
}

