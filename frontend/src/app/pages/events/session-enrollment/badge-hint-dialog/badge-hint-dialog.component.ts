import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';

@Component({
  selector: 'app-badge-hint-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './badge-hint-dialog.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class BadgeHintDialogComponent {
  constructor(private dialogRef: DialogRef) {}

  close(): void {
    this.dialogRef.close();
  }
}

