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
      class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 font-poppins"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full animate-[fadeInDown_0.2s_ease-out]">
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
