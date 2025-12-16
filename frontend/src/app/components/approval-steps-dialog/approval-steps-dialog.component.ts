import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-approval-steps-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="approval-steps-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2 class="dialog-title">
          <i class="fas fa-tasks mr-2"></i>
          {{ 'course.approvalSteps' | translate }}
        </h2>
        <button (click)="close()" class="close-button" aria-label="Close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <div class="space-y-3">
          <div
            *ngFor="let step of data.approvalSteps; let i = index"
            class="approval-step"
            [ngClass]="{
              'approved': step.isApproved,
              'rejected': step.isRejected,
              'pending': !step.isApproved && !step.isRejected
            }"
          >
            <!-- Step Header -->
            <div class="step-header">
              <div class="step-badge" [ngClass]="{
                'badge-approved': step.isApproved,
                'badge-rejected': step.isRejected,
                'badge-pending': !step.isApproved && !step.isRejected
              }">
                {{ step.courseTabApproval?.approvalOrder || i + 1 }}
              </div>
              
              <div class="step-info">
                <div class="step-title">
                  <span class="font-medium">
                    {{ 'course.approvalStep' | translate }} {{ step.courseTabApproval?.approvalOrder || i + 1 }}
                  </span>
                  <span
                    *ngIf="step.courseTabApproval?.isHeadApproval"
                    class="role-badge badge-head"
                  >
                    <i class="fas fa-user-tie mr-1"></i>
                    {{ 'course.headApproval' | translate }}
                  </span>
                  <span
                    *ngIf="step.courseTabApproval?.role"
                    class="role-badge badge-role"
                  >
                    <i class="fas fa-shield-alt mr-1"></i>
                    {{ step.courseTabApproval?.role?.name }}
                  </span>
                </div>

                <!-- Status -->
                <div class="step-status">
                  <i class="fas" [ngClass]="{
                    'fa-check-circle text-green-600': step.isApproved,
                    'fa-times-circle text-red-600': step.isRejected,
                    'fa-clock text-gray-500': !step.isApproved && !step.isRejected
                  }"></i>
                  <span [ngClass]="{
                    'text-green-700': step.isApproved,
                    'text-red-700': step.isRejected,
                    'text-gray-600': !step.isApproved && !step.isRejected
                  }">
                    {{ step.isApproved ? ('course.approved' | translate) : 
                       step.isRejected ? ('course.rejected' | translate) : 
                       ('course.pending' | translate) }}
                  </span>
                  <span *ngIf="step.approvedAt" class="text-gray-500 ml-2">
                    {{ formatDateTime(step.approvedAt) }}
                  </span>
                </div>

                <!-- Approved By -->
                <div *ngIf="step.approvedByUser" class="step-meta">
                  <i class="fas fa-user text-gray-400 mr-1"></i>
                  <span class="text-gray-600">{{ step.approvedByUser.fullName }}</span>
                </div>

                <!-- Comments -->
                <div *ngIf="step.comments" class="step-comments">
                  <i class="fas fa-comment text-gray-400 mr-1"></i>
                  <span class="text-gray-600 italic">{{ step.comments }}</span>
                </div>

                <!-- Waiting Message -->
                <div
                  *ngIf="!step.isApproved && !step.isRejected && !data.canApproveStep(step)"
                  class="step-waiting"
                >
                  <i class="fas fa-hourglass-half mr-1"></i>
                  {{ 'course.waitingPreviousStep' | translate }}
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div
              *ngIf="!step.isApproved && !step.isRejected && !step.courseTabApproval?.isHeadApproval && data.canApproveStep(step) && !data.enrollment.finalApproval"
              class="step-actions"
            >
              <button
                (click)="approveStep(step)"
                class="btn btn-approve"
              >
                <i class="fas fa-check mr-1"></i>
                {{ 'course.approve' | translate }}
              </button>
              <button
                (click)="rejectStep(step)"
                class="btn btn-reject"
              >
                <i class="fas fa-times mr-1"></i>
                {{ 'course.reject' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <button (click)="close()" class="btn btn-secondary">
          <i class="fas fa-times mr-1"></i>
          {{ 'common.close' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .approval-steps-dialog {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      background: #0F4C75;
      color: white;
    }

    .dialog-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
    }

    .close-button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      color: white;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    .dialog-content {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .approval-step {
      border: 2px solid;
      border-radius: 12px;
      padding: 1rem;
      transition: all 0.3s;
    }

    .approval-step.approved {
      background: #f0fdf4;
      border-color: #86efac;
    }

    .approval-step.rejected {
      background: #fef2f2;
      border-color: #fca5a5;
    }

    .approval-step.pending {
      background: #f9fafb;
      border-color: #e5e7eb;
    }

    .step-header {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .step-badge {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
      flex-shrink: 0;
      color: white;
    }

    .badge-approved {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
    }

    .badge-rejected {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);
    }

    .badge-pending {
      background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
      box-shadow: 0 4px 6px rgba(156, 163, 175, 0.3);
    }

    .step-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .step-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      font-size: 0.95rem;
    }

    .role-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
    }

    .badge-head {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge-role {
      background: #f3e8ff;
      color: #7c3aed;
    }

    .step-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .step-meta,
    .step-comments {
      display: flex;
      align-items: center;
      font-size: 0.875rem;
    }

    .step-waiting {
      display: flex;
      align-items: center;
      font-size: 0.875rem;
      color: #6b7280;
      font-style: italic;
    }

    .step-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-approve {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
    }

    .btn-approve:hover {
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
      transform: translateY(-1px);
    }

    .btn-reject {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
    }

    .btn-reject:hover {
      box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4);
      transform: translateY(-1px);
    }

    .dialog-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      background: #f9fafb;
    }

    .btn-secondary {
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .space-y-3 > * + * {
      margin-top: 0.75rem;
    }
  `]
})
export class ApprovalStepsDialogComponent {
  data: any;

  constructor(public ref: DialogRef) {
    this.data = ref.data;
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  approveStep(step: any): void {
    this.ref.close({ action: 'approve', step });
  }

  rejectStep(step: any): void {
    this.ref.close({ action: 'reject', step });
  }

  close(): void {
    this.ref.close();
  }
}
