import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../services/storage.service';
import { UserService } from '../../services/user.service';
import { LoadingService } from '../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingComponent } from '../../components/loading/loading.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, LoadingComponent],
  template: `
    <div class="p-6 max-w-6xl mx-auto">
      <!-- Loading Indicator -->
      <app-loading *ngIf="isLoading"></app-loading>

      <!-- Profile Card -->
      <div
        class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        <!-- Profile Header -->
        <div
          class="bg-gradient-to-r from-[#f9f6f2] to-white p-6 border-b border-gray-200"
        >
          <div class="flex items-center space-x-4">
            <div
              class="h-24 w-24 rounded-full bg-[#c9ae81]/10 flex items-center justify-center border-2 border-[#c9ae81]/20"
            >
              <span class="text-4xl text-[#c9ae81] font-semibold">{{
                getInitials()
              }}</span>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-800">
                {{ user?.fullName }}
              </h2>
              <p class="text-sm text-gray-500">{{ user?.email }}</p>
              <div class="mt-2">
                <span
                  [ngClass]="{
                    'bg-green-100 text-green-800': user?.isActive,
                    'bg-red-100 text-red-800': !user?.isActive
                  }"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ user?.isActive ? 'Active' : 'Inactive' }}
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
              <div class="flex items-center space-x-2 mb-4">
                <i class="fas fa-user-circle text-[#c9ae81]"></i>
                <h3 class="text-lg font-medium text-gray-800">
                  Personal Information
                </h3>
              </div>
              <div class="space-y-4">
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="text-sm font-medium text-gray-500 block mb-1">
                    Full Name
                  </label>
                  <p class="text-gray-900 font-medium">{{ user?.fullName }}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="text-sm font-medium text-gray-500 block mb-1">
                    Email
                  </label>
                  <p class="text-gray-900 font-medium">{{ user?.email }}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="text-sm font-medium text-gray-500 block mb-1">
                    Username
                  </label>
                  <p class="text-gray-900 font-medium">
                    {{ user?.adUsername }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="text-sm font-medium text-gray-500 block mb-1">
                    Last Login
                  </label>
                  <p class="text-gray-900 font-medium">
                    {{ user?.lastLogin | date : 'medium' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Organization Information -->
            <div class="space-y-4">
              <div class="flex items-center space-x-2 mb-4">
                <i class="fas fa-building text-[#c9ae81]"></i>
                <h3 class="text-lg font-medium text-gray-800">
                  Organization Information
                </h3>
              </div>
              <div class="space-y-4">
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="text-sm font-medium text-gray-500 block mb-1">
                    Organization
                  </label>
                  <p class="text-gray-900 font-medium">
                    {{ user?.position?.department?.organization?.name }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="text-sm font-medium text-gray-500 block mb-1">
                    Department
                  </label>
                  <p class="text-gray-900 font-medium">
                    {{ user?.position?.department?.name }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="text-sm font-medium text-gray-500 block mb-1">
                    Position
                  </label>
                  <p class="text-gray-900 font-medium">
                    {{ user?.position?.title }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="text-sm font-medium text-gray-500 block mb-1">
                    Created On
                  </label>
                  <p class="text-gray-900 font-medium">
                    {{ user?.createdOn | date : 'medium' }}
                  </p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <label class="text-sm font-medium text-gray-500 block mb-1">
                    Last Updated By
                  </label>
                  <p class="text-gray-900 font-medium">{{ user?.updatedBy }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.isLoading = true;
    const currentUser = this.storageService.getItem<any>('currentUser');
    if (currentUser?.id) {
      this.userService.getUserById(currentUser.id).subscribe({
        next: (response) => {
          if (response.statusCode === 200) {
            this.user = response.result;
          } else {
            this.toastr.error(response.message || 'Failed to load user data');
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.toastr.error('Failed to load user data');
          this.isLoading = false;
        },
      });
    } else {
      this.toastr.error('User information not found');
      this.isLoading = false;
    }
  }

  getInitials(): string {
    return this.user?.fullName?.charAt(0)?.toUpperCase() || 'U';
  }
}
