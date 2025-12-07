import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div
      *ngIf="isVisible"
      class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <ng-container *ngIf="currentComponent">
          <ng-container *ngComponentOutlet="currentComponent"></ng-container>
        </ng-container>
      </div>
    </div>
  `,
})
export class DialogComponent implements OnInit {
  isVisible = false;
  currentComponent: any = null;

  constructor(private dialogService: DialogService) {}

  ngOnInit(): void {
    this.dialogService.dialogState$.subscribe((state) => {
      this.isVisible = state.isOpen;
      this.currentComponent = state.component;
    });
  }
}
