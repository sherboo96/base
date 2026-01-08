import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef } from '@ngneat/dialog';
import { PublicService, SupportInfo, SupportContact } from '../../services/public.service';
import { LoadingService } from '../../services/loading.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-support-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="bg-white rounded-xl shadow-2xl w-full font-poppins overflow-hidden border border-gray-100 m-0 p-0">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-accent/10 via-accent-light/10 to-accent/10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <i class="fas fa-headset text-accent text-lg"></i>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 font-poppins">
              {{ 'support.title' | translate }}
            </h3>
          </div>
        </div>
      </div>

      <!-- Content Section -->
      <div class="px-6 py-6 min-h-[200px] max-h-[400px] overflow-y-auto">
        <!-- Loading State -->
        <div *ngIf="loading" class="flex flex-col items-center justify-center py-16">
          <div class="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <i class="fas fa-spinner fa-spin text-accent text-2xl"></i>
          </div>
          <p class="text-sm text-gray-500 font-medium">{{ 'common.loading' | translate }}</p>
        </div>

        <!-- Content State -->
        <div *ngIf="!loading" class="space-y-4">
          <!-- Contacts Section -->
          <div *ngIf="contacts && contacts.length > 0" class="space-y-3">
            <div *ngFor="let contact of contacts; trackBy: trackByContact" 
                 class="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <h4 class="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <i class="fas fa-user text-accent text-sm"></i>
                </div>
                <span>{{ contact.name }}</span>
              </h4>
              <div class="space-y-2 pl-10">
                <!-- Email -->
                <div *ngIf="contact.email" class="flex items-center gap-3 group">
                  <div class="w-2 h-2 rounded-full bg-accent flex-shrink-0"></div>
                  <i class="fas fa-envelope text-gray-400 text-xs"></i>
                  <a [href]="'mailto:' + contact.email" 
                     class="text-sm text-accent hover:text-accent-dark hover:underline transition-all duration-200 break-all font-medium group-hover:translate-x-1">
                    {{ contact.email }}
                  </a>
                </div>
                <!-- Phone -->
                <div *ngIf="contact.phoneNumber" class="flex items-center gap-3 group">
                  <div class="w-2 h-2 rounded-full bg-accent flex-shrink-0"></div>
                  <i class="fas fa-phone text-gray-400 text-xs"></i>
                  <a [href]="'tel:' + contact.phoneNumber" 
                     class="text-sm text-accent hover:text-accent-dark hover:underline transition-all duration-200 font-medium group-hover:translate-x-1">
                    {{ contact.phoneNumber }}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && (!contacts || contacts.length === 0)" 
               class="flex flex-col items-center justify-center py-16 text-gray-500">
            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <i class="fas fa-info-circle text-3xl text-gray-400"></i>
            </div>
            <p class="text-sm font-medium">{{ 'support.noInfo' | translate }}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
        <button
          (click)="dialogRef.close()"
          class="px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-dark transition-all duration-200 font-poppins font-medium flex items-center gap-2 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
        >
          <i class="fas fa-times text-sm"></i>
          <span>{{ 'common.close' | translate }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class SupportDialogComponent implements OnInit {
  contacts: SupportContact[] = [];
  loading = true;

  trackByContact(index: number, contact: SupportContact): string {
    return `${contact.name}-${contact.email}-${contact.phoneNumber}`;
  }

  constructor(
    public dialogRef: DialogRef,
    private publicService: PublicService,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSupportInfo();
  }

  loadSupportInfo(): void {
    this.loading = true;
    this.contacts = [];
    this.cdr.detectChanges();
    
    this.publicService.getSupportInfo().subscribe({
      next: (response: any) => {
        console.log('Support info response:', response);
        this.loading = false;
        
        if (response) {
          // Handle both direct response and wrapped response
          const result = response.result || response;
          
          if (result?.contacts && Array.isArray(result.contacts) && result.contacts.length > 0) {
            // New format: use contacts array
            this.contacts = result.contacts.filter((c: SupportContact) => c.name && (c.email || c.phoneNumber));
          } else if (result?.emails || result?.phoneNumbers) {
            // Legacy format: convert emails/phoneNumbers to contacts
            const emails = Array.isArray(result.emails) ? result.emails : [];
            const phones = Array.isArray(result.phoneNumbers) ? result.phoneNumbers : [];
            const maxCount = Math.max(emails.length, phones.length);
            
            this.contacts = [];
            for (let i = 0; i < maxCount; i++) {
              if (emails[i] || phones[i]) {
                this.contacts.push({
                  name: `Contact ${i + 1}`,
                  email: emails[i] || '',
                  phoneNumber: phones[i] || ''
                });
              }
            }
          } else {
            this.contacts = [];
          }
        } else {
          this.contacts = [];
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading support info:', error);
        this.loading = false;
        this.contacts = [];
        this.cdr.detectChanges();
      },
    });
  }
}

