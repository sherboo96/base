import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../services/storage.service';
import { UserService } from '../../services/user.service';
import { LoadingService } from '../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingComponent } from '../../components/loading/loading.component';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, LoadingComponent, TranslateModule],
  template: `
    <div class="max-w-6xl mx-auto px-4 lg:px-6 py-6">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-900 font-poppins mb-2">
          {{ 'profile.title' | translate }}
        </h1>
        <nav class="text-sm text-gray-500 font-poppins">
          <span>{{ 'common.management' | translate }}</span>
          <span class="mx-2">/</span>
          <span class="text-accent">{{ 'profile.title' | translate }}</span>
        </nav>
      </div>

      <!-- Loading Indicator -->
      <app-loading *ngIf="isLoading"></app-loading>

      <!-- Profile Card -->
      <div *ngIf="!isLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <!-- Profile Header -->
        <div class="bg-gradient-to-r from-accent/10 via-accent-light/10 to-accent/10 p-6 border-b border-gray-200">
          <div class="flex items-center gap-4">
            <div class="h-24 w-24 rounded-full bg-accent/10 flex items-center justify-center border-2 border-accent/20 flex-shrink-0">
              <span class="text-4xl text-accent font-semibold font-poppins">{{
                getInitials()
              }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-xl font-semibold text-gray-900 font-poppins truncate">
                {{ user?.fullName || ('profile.noName' | translate) }}
              </h2>
              <p class="text-sm text-gray-600 font-poppins truncate mt-1">
                {{ user?.email || ('profile.noEmail' | translate) }}
              </p>
              <div class="mt-2">
                <span
                  [ngClass]="{
                    'bg-green-100 text-green-800 border-green-200': user?.isActive,
                    'bg-red-100 text-red-800 border-red-200': !user?.isActive
                  }"
                  class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border font-poppins"
                >
                  {{ user?.isActive ? ('profile.active' | translate) : ('profile.inactive' | translate) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Profile Details -->
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Personal Information -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <i class="fas fa-user-circle text-accent"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 font-poppins">
                  {{ 'profile.personalInformation' | translate }}
                </h3>
              </div>
              <div class="space-y-3">
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label class="text-xs font-medium text-gray-500 block mb-1.5 font-poppins">
                    {{ 'profile.fullName' | translate }}
                  </label>
                  <p class="text-sm text-gray-900 font-medium font-poppins">
                    {{ user?.fullName || ('profile.notAvailable' | translate) }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label class="text-xs font-medium text-gray-500 block mb-1.5 font-poppins">
                    {{ 'profile.email' | translate }}
                  </label>
                  <p class="text-sm text-gray-900 font-medium font-poppins break-all">
                    {{ user?.email || ('profile.notAvailable' | translate) }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label class="text-xs font-medium text-gray-500 block mb-1.5 font-poppins">
                    {{ 'profile.username' | translate }}
                  </label>
                  <p class="text-sm text-gray-900 font-medium font-poppins">
                    {{ user?.adUsername || user?.userName || ('profile.notAvailable' | translate) }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label class="text-xs font-medium text-gray-500 block mb-1.5 font-poppins">
                    {{ 'profile.lastLogin' | translate }}
                  </label>
                  <p class="text-sm text-gray-900 font-medium font-poppins">
                    {{ user?.lastLogin ? (user.lastLogin | date : 'medium') : ('profile.never' | translate) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Organization Information -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <i class="fas fa-building text-accent"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 font-poppins">
                  {{ 'profile.organizationInformation' | translate }}
                </h3>
              </div>
              <div class="space-y-3">
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label class="text-xs font-medium text-gray-500 block mb-1.5 font-poppins">
                    {{ 'profile.organization' | translate }}
                  </label>
                  <p class="text-sm text-gray-900 font-medium font-poppins">
                    {{ user?.position?.department?.organization?.name || 
                       user?.organization?.name || 
                       ('profile.notAvailable' | translate) }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label class="text-xs font-medium text-gray-500 block mb-1.5 font-poppins">
                    {{ 'profile.department' | translate }}
                  </label>
                  <p class="text-sm text-gray-900 font-medium font-poppins">
                    {{ user?.position?.department?.name || 
                       user?.department?.name || 
                       ('profile.notAvailable' | translate) }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label class="text-xs font-medium text-gray-500 block mb-1.5 font-poppins">
                    {{ 'profile.position' | translate }}
                  </label>
                  <p class="text-sm text-gray-900 font-medium font-poppins">
                    {{ user?.position?.title || 
                       user?.jobTitle?.nameEn || 
                       ('profile.notAvailable' | translate) }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label class="text-xs font-medium text-gray-500 block mb-1.5 font-poppins">
                    {{ 'profile.createdOn' | translate }}
                  </label>
                  <p class="text-sm text-gray-900 font-medium font-poppins">
                    {{ user?.createdOn ? (user.createdOn | date : 'medium') : ('profile.notAvailable' | translate) }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <label class="text-xs font-medium text-gray-500 block mb-1.5 font-poppins">
                    {{ 'profile.lastUpdatedBy' | translate }}
                  </label>
                  <p class="text-sm text-gray-900 font-medium font-poppins">
                    {{ user?.updatedBy || ('profile.notAvailable' | translate) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && !user" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-user-slash text-3xl text-gray-400"></i>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2 font-poppins">
          {{ 'profile.noData' | translate }}
        </h3>
        <p class="text-sm text-gray-500 font-poppins">
          {{ 'profile.noDataMessage' | translate }}
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  user: any;
  isLoading = false;

  constructor(
    private storageService: StorageService,
    private userService: UserService,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.isLoading = true;
    this.loadingService.show();
    
    const currentUser = this.storageService.getItem<any>('currentUser');
    if (currentUser?.id) {
      this.userService.getUserById(currentUser.id).subscribe({
        next: (response) => {
          this.loadingService.hide();
          this.isLoading = false;
          
          if (response.statusCode === 200 && response.result) {
            this.user = response.result;
            console.log('User data loaded:', this.user);
          } else {
            this.toastr.error(
              response.message || this.translationService.instant('profile.loadError')
            );
            this.user = null;
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading user data:', error);
          this.loadingService.hide();
          this.isLoading = false;
          this.user = null;
          this.toastr.error(
            error.error?.message || this.translationService.instant('profile.loadError')
          );
          this.cdr.detectChanges();
        },
      });
    } else {
      this.loadingService.hide();
      this.isLoading = false;
      this.user = null;
      this.toastr.error(this.translationService.instant('profile.userNotFound'));
      this.cdr.detectChanges();
    }
  }

  getInitials(): string {
    if (this.user?.fullName) {
      const names = this.user.fullName.trim().split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      }
      return this.user.fullName.charAt(0).toUpperCase();
    }
    return 'U';
  }
}

