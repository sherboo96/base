import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { EventRegistrationService, EventRegistration, EventRegistrationStatus, VipStatus } from '../../../../../services/event-registration.service';
import { EventOrganizationService } from '../../../../../services/event-organization.service';
import { UserService, UserResponse } from '../../../../../services/user.service';
import { DepartmentService } from '../../../../../services/department.service';
import { JobTitleService } from '../../../../../services/job-title.service';
import { LoadingService } from '../../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../../services/translation.service';

@Component({
  selector: 'app-event-registration-manual-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslateModule],
  template: `
    <div class="p-6 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="mb-6 pb-4 border-b border-gray-200">
        <div class="flex items-center space-x-3">
          <div class="p-2.5 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl">
            <i class="fas fa-user-plus text-accent text-xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-900 font-poppins">
              {{ 'eventRegistration.manualRegistration' | translate }}
            </h3>
            <p class="text-sm text-gray-500 mt-1 font-poppins">
              {{ 'eventRegistration.manualRegistrationDescription' | translate }}
            </p>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
        <!-- User Selection Section -->
        <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <label class="block text-sm font-semibold text-gray-800 font-poppins mb-3">
            <i class="fas fa-users mr-2 text-accent"></i>
            {{ 'eventRegistration.selectUser' | translate }}
          </label>
          <div class="user-search-container relative">
            <div class="flex gap-2">
              <div class="relative flex-1">
              <input
                type="text"
                [(ngModel)]="userSearchTerm"
                [ngModelOptions]="{standalone: true}"
                (keydown.enter)="onSearchButtonClick()"
                (focus)="onUserInputFocus()"
                [placeholder]="'eventRegistration.searchUser' | translate"
                class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white shadow-sm"
              />
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-user text-gray-400 text-sm"></i>
                </div>
              </div>
              <button
                type="button"
                (click)="onSearchButtonClick()"
                [disabled]="isSearchingUsers"
                class="px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-accentDark transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed font-poppins flex items-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap"
              >
                <i class="fas" [class.fa-search]="!isSearchingUsers" [class.fa-spinner]="isSearchingUsers" [class.fa-spin]="isSearchingUsers"></i>
                <span class="hidden sm:inline">{{ 'common.search' | translate }}</span>
              </button>
            </div>
            
            <!-- User Dropdown -->
            <div
              *ngIf="isUserDropdownOpen"
              class="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border-2 border-gray-200 max-h-60 overflow-auto"
            >
              <div class="py-1">
                <div *ngIf="isSearchingUsers" class="px-4 py-3 text-sm text-gray-500 text-center">
                  <i class="fas fa-spinner fa-spin mr-2"></i>
                  {{ 'common.searching' | translate }}
                </div>
                <div
                  *ngFor="let user of userOptions"
                  (click)="selectUser(user.id)"
                  class="px-4 py-2.5 text-sm text-gray-700 hover:bg-accent/10 hover:text-accent cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                >
                  <div class="flex items-center gap-2">
                    <i class="fas fa-user-circle text-gray-400 text-xs"></i>
                    <span class="flex-1 font-poppins">{{ user.name }}</span>
                  </div>
                </div>
                <div
                  *ngIf="!isSearchingUsers && userOptions.length === 0 && userSearchTerm && userSearchTerm.length >= 2"
                  class="px-4 py-3 text-sm text-gray-500 text-center font-poppins"
                >
                  <i class="fas fa-info-circle mr-2"></i>
                  {{ 'eventRegistration.noUsersFound' | translate }}
                </div>
                <div
                  *ngIf="!isSearchingUsers && userOptions.length === 0 && (!userSearchTerm || userSearchTerm.length < 2)"
                  class="px-4 py-3 text-sm text-gray-500 text-center font-poppins"
                >
                  <i class="fas fa-keyboard mr-2"></i>
                  {{ 'eventRegistration.typeToSearchUsers' | translate }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Personal Information Section -->
        <div class="bg-white rounded-xl p-4 border border-gray-200">
          <h4 class="text-sm font-semibold text-gray-800 font-poppins mb-4 pb-2 border-b border-gray-200">
            <i class="fas fa-id-card mr-2 text-accent"></i>
            {{ 'eventRegistration.personalInformation' | translate }}
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Name (English) -->
            <div class="space-y-2">
              <label for="name" class="block text-sm font-medium text-gray-700 font-poppins">
                {{ 'eventRegistration.nameEn' | translate }}
                <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-user text-gray-400 text-sm"></i>
                </div>
                <input
                  id="name"
                  type="text"
                  formControlName="name"
                  class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white"
                  [class.border-red-500]="form.get('name')?.invalid && form.get('name')?.touched"
                  [placeholder]="'eventRegistration.nameEnPlaceholder' | translate"
                />
              </div>
              <div *ngIf="form.get('name')?.invalid && form.get('name')?.touched" class="flex items-center text-xs text-red-600 mt-1">
                <i class="fas fa-exclamation-circle mr-1 text-xs"></i>
                <span>{{ 'eventRegistration.nameEnRequired' | translate }}</span>
              </div>
            </div>

            <!-- Name (Arabic) -->
            <div class="space-y-2">
              <label for="nameAr" class="block text-sm font-medium text-gray-700 font-poppins">
                {{ 'eventRegistration.nameAr' | translate }}
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-user text-gray-400 text-sm"></i>
                </div>
                <input
                  id="nameAr"
                  type="text"
                  formControlName="nameAr"
                  class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white"
                  [dir]="'rtl'"
                  [placeholder]="'eventRegistration.nameArPlaceholder' | translate"
                />
              </div>
            </div>

            <!-- Email -->
            <div class="space-y-2 md:col-span-2">
              <label for="email" class="block text-sm font-medium text-gray-700 font-poppins">
                {{ 'eventRegistration.email' | translate }}
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-envelope text-gray-400 text-sm"></i>
                </div>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white"
                  [placeholder]="'eventRegistration.emailPlaceholder' | translate"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Job Information Section -->
        <div class="bg-white rounded-xl p-4 border border-gray-200">
          <h4 class="text-sm font-semibold text-gray-800 font-poppins mb-4 pb-2 border-b border-gray-200">
            <i class="fas fa-briefcase mr-2 text-accent"></i>
            {{ 'eventRegistration.jobInformation' | translate }}
          </h4>
          <div class="space-y-4">
            <!-- Department Selection (shown when user has no jobTitle) -->
            <div *ngIf="showDepartmentSelection" class="space-y-2">
              <label for="departmentId" class="block text-sm font-medium text-gray-700 font-poppins">
                {{ 'eventRegistration.department' | translate }}
                <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-building text-gray-400 text-sm"></i>
                </div>
                <select
                  id="departmentId"
                  formControlName="departmentId"
                  (change)="onDepartmentChange()"
                  class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 appearance-none bg-white font-poppins"
                  [class.border-red-500]="form.get('departmentId')?.invalid && form.get('departmentId')?.touched"
                >
                  <option [ngValue]="null">{{ 'eventRegistration.selectDepartment' | translate }}</option>
                  <option *ngFor="let dept of departments" [ngValue]="dept.id">
                    {{ dept.nameEn }}
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
                </div>
              </div>
              <div *ngIf="form.get('departmentId')?.invalid && form.get('departmentId')?.touched" class="flex items-center text-xs text-red-600 mt-1">
                <i class="fas fa-exclamation-circle mr-1 text-xs"></i>
                <span>{{ 'eventRegistration.departmentRequired' | translate }}</span>
              </div>
            </div>

            <!-- Job Title Selection (shown when department is selected) -->
            <div *ngIf="showJobTitleSelection" class="space-y-2">
              <label for="jobTitleId" class="block text-sm font-medium text-gray-700 font-poppins">
                {{ 'eventRegistration.jobTitle' | translate }}
                <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-briefcase text-gray-400 text-sm"></i>
                </div>
                <select
                  id="jobTitleId"
                  formControlName="jobTitleId"
                  (change)="onJobTitleChange()"
                  class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 appearance-none bg-white font-poppins"
                  [class.border-red-500]="form.get('jobTitleId')?.invalid && form.get('jobTitleId')?.touched"
                >
                  <option [ngValue]="null">{{ 'eventRegistration.selectJobTitle' | translate }}</option>
                  <option *ngFor="let jobTitle of jobTitles" [ngValue]="jobTitle.id">
                    {{ jobTitle.nameEn }}
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
                </div>
              </div>
              <div *ngIf="form.get('jobTitleId')?.invalid && form.get('jobTitleId')?.touched" class="flex items-center text-xs text-red-600 mt-1">
                <i class="fas fa-exclamation-circle mr-1 text-xs"></i>
                <span>{{ 'eventRegistration.jobTitleRequired' | translate }}</span>
              </div>
            </div>

            <!-- Job Title Text Input (shown when user has jobTitle or when jobTitle is selected from dropdown) -->
            <div *ngIf="!showJobTitleSelection" class="space-y-2">
              <label for="jobTitle" class="block text-sm font-medium text-gray-700 font-poppins">
                {{ 'eventRegistration.jobTitle' | translate }}
                <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-briefcase text-gray-400 text-sm"></i>
                </div>
                <input
                  id="jobTitle"
                  type="text"
                  formControlName="jobTitle"
                  class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white"
                  [class.border-red-500]="form.get('jobTitle')?.invalid && form.get('jobTitle')?.touched"
                  [placeholder]="'eventRegistration.jobTitlePlaceholder' | translate"
                />
              </div>
              <div *ngIf="form.get('jobTitle')?.invalid && form.get('jobTitle')?.touched" class="flex items-center text-xs text-red-600 mt-1">
                <i class="fas fa-exclamation-circle mr-1 text-xs"></i>
                <span>{{ 'eventRegistration.jobTitleRequired' | translate }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Organization Section -->
        <div class="bg-white rounded-xl p-4 border border-gray-200">
          <h4 class="text-sm font-semibold text-gray-800 font-poppins mb-4 pb-2 border-b border-gray-200">
            <i class="fas fa-building mr-2 text-accent"></i>
            {{ 'eventRegistration.organization' | translate }}
          </h4>
          <div class="space-y-4">
            <!-- Organization -->
            <div class="space-y-2">
              <label for="eventOrganizationId" class="block text-sm font-medium text-gray-700 font-poppins">
                {{ 'eventRegistration.organization' | translate }}
                <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-building text-gray-400 text-sm"></i>
                </div>
                <select
                  id="eventOrganizationId"
                  formControlName="eventOrganizationId"
                  (change)="onOrganizationChange()"
                  class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 appearance-none bg-white font-poppins"
                  [class.border-red-500]="form.get('eventOrganizationId')?.invalid && form.get('eventOrganizationId')?.touched"
                >
                  <option [ngValue]="null">{{ 'eventRegistration.selectOrganization' | translate }}</option>
                  <option *ngFor="let org of eventOrganizations" [ngValue]="org.id">
                    {{ org.name }}
                  </option>
                  <option [ngValue]="'other'">{{ 'eventRegistration.otherOrganization' | translate }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
                </div>
              </div>
              <div *ngIf="form.get('eventOrganizationId')?.invalid && form.get('eventOrganizationId')?.touched" class="flex items-center text-xs text-red-600 mt-1">
                <i class="fas fa-exclamation-circle mr-1 text-xs"></i>
                <span>{{ 'eventRegistration.organizationRequired' | translate }}</span>
              </div>
            </div>

            <!-- Other Organization Input -->
            <div *ngIf="showOtherOrganization" class="space-y-2">
              <label for="otherOrganization" class="block text-sm font-medium text-gray-700 font-poppins">
                {{ 'eventRegistration.otherOrganizationName' | translate }}
                <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-building text-gray-400 text-sm"></i>
                </div>
                <input
                  id="otherOrganization"
                  type="text"
                  formControlName="otherOrganization"
                  class="w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white"
                  [class.border-red-500]="form.get('otherOrganization')?.invalid && form.get('otherOrganization')?.touched"
                  [placeholder]="'eventRegistration.enterOrganizationName' | translate"
                />
              </div>
              <div *ngIf="form.get('otherOrganization')?.invalid && form.get('otherOrganization')?.touched" class="flex items-center text-xs text-red-600 mt-1">
                <i class="fas fa-exclamation-circle mr-1 text-xs"></i>
                <span>{{ 'eventRegistration.otherOrganizationRequired' | translate }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- VIP Status -->
        <div class="bg-white rounded-xl p-4 border border-gray-200">
          <h4 class="text-sm font-semibold text-gray-800 font-poppins mb-4 pb-2 border-b border-gray-200">
            <i class="fas fa-tags mr-2 text-accent"></i>
            {{ 'eventRegistration.additionalInfo' | translate }}
          </h4>
          <div class="space-y-3">
            <div class="space-y-2">
              <label for="vipStatus" class="block text-sm font-medium text-gray-700 font-poppins">
                {{ 'eventRegistration.vipStatus' | translate }}
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-star text-gray-400"></i>
                </div>
                <select
                  id="vipStatus"
                  formControlName="vipStatus"
                  class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 appearance-none bg-white font-poppins"
                >
                  <option [value]="0">{{ 'eventRegistration.attendee' | translate }}</option>
                  <option [value]="1">{{ 'eventRegistration.vip' | translate }}</option>
                  <option [value]="2">{{ 'eventRegistration.vVip' | translate }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Message -->
        <div class="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <div class="p-1.5 bg-blue-100 rounded-lg">
              <i class="fas fa-info-circle text-blue-600 text-sm"></i>
            </div>
            <p class="text-xs text-blue-800 font-poppins leading-relaxed flex-1">
              {{ 'eventRegistration.manualRegistrationInfo' | translate }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            (click)="onCancel()"
            class="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium font-poppins shadow-sm hover:shadow"
          >
            {{ 'common.cancel' | translate }}
          </button>
          <button
            type="submit"
            [disabled]="form.invalid || isSubmitting"
            class="px-6 py-2.5 bg-accentDark text-white rounded-lg hover:bg-accentDarker transition-all duration-200 shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed font-poppins flex items-center gap-2"
          >
            <span *ngIf="!isSubmitting" class="flex items-center gap-2">
              <i class="fas fa-user-plus"></i>
              {{ 'eventRegistration.addManual' | translate }}
            </span>
            <span *ngIf="isSubmitting" class="flex items-center gap-2">
              <i class="fas fa-spinner fa-spin"></i>
              {{ 'common.processing' | translate }}
            </span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class EventRegistrationManualFormComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  eventOrganizations: any[] = [];
  showOtherOrganization = false;
  eventId: number;
  
  // User selection
  userOptions: Array<{ id: string; name: string }> = [];
  selectedUserId: string | null = null;
  selectedUser: any = null;
  userSearchTerm: string = '';
  isUserDropdownOpen = false;
  isSearchingUsers = false;
  
  // Department and Job Title
  departments: any[] = [];
  jobTitles: any[] = [];
  showDepartmentSelection = false;
  showJobTitleSelection = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: DialogRef<{ eventId: number }>,
    private eventRegistrationService: EventRegistrationService,
    private eventOrganizationService: EventOrganizationService,
    private userService: UserService,
    private departmentService: DepartmentService,
    private jobTitleService: JobTitleService,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.eventId = this.dialogRef.data.eventId;
    this.form = this.fb.group({
      userId: [null],
      name: ['', Validators.required],
      nameAr: [''],
      email: [''],
      jobTitle: ['', Validators.required],
      jobTitleId: [null],
      departmentId: [null],
      eventOrganizationId: [null, Validators.required],
      otherOrganization: [''],
      vipStatus: [VipStatus.Attendee]
    });
  }

  ngOnInit(): void {
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadEventOrganizations();
    }, 0);
  }

  onUserInputFocus(): void {
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.isUserDropdownOpen = true;
      this.cdr.detectChanges();
    }, 0);
  }

  onSearchButtonClick(): void {
    const searchTerm = this.userSearchTerm?.trim() || '';
    
    if (!searchTerm || searchTerm.length < 2) {
      this.toastr.warning(this.translationService.instant('eventRegistration.typeToSearchUsers'));
      return;
    }
    
    this.isUserDropdownOpen = true;
    this.isSearchingUsers = true;
    this.cdr.detectChanges();
    
    this.userService.getUsers(1, 50, searchTerm).subscribe({
      next: (response: UserResponse) => {
        this.isSearchingUsers = false;
        if (response.statusCode === 200 && response.result) {
          this.userOptions = response.result.map((user: any) => ({
            id: String(user.id || user.Id),
            name: `${user.fullName || user.FullName || user.fullNameEn || ''}${user.email || user.Email ? ' (' + (user.email || user.Email) + ')' : ''}`
          }));
        } else {
          this.userOptions = [];
        }
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error searching users:', error);
        this.isSearchingUsers = false;
        this.userOptions = [];
        this.toastr.error(this.translationService.instant('eventRegistration.userSearchError') || 'Error searching users');
        this.cdr.detectChanges();
      }
    });
  }

  selectUser(userId: string): void {
    this.selectedUserId = userId;
    const selectedUserOption = this.userOptions.find(u => u.id === userId);
    if (selectedUserOption) {
      this.userSearchTerm = selectedUserOption.name;
    }
    this.isUserDropdownOpen = false;
    this.onUserSelected(userId);
  }

  onUserSelected(userId: string | null): void {
    this.selectedUserId = userId;
    if (!userId) {
      this.selectedUser = null;
      this.showDepartmentSelection = false;
      this.showJobTitleSelection = false;
      this.form.patchValue({
        name: '',
        nameAr: '',
        email: '',
        jobTitle: '',
        jobTitleId: null,
        departmentId: null
      });
      return;
    }

    // Load user details
    this.loadingService.show();
    this.userService.getUserById(userId).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.selectedUser = response.result;
          const user = response.result;
          
          // Fill form with user data
          const userId = user.id || user.Id;
          const fullName = user.fullName || user.FullName || '';
          const fullNameAr = user.fullNameAr || user.FullNameAr || '';
          const email = user.email || user.Email || '';
          const jobTitleId = user.jobTitleId || user.JobTitleId;
          const jobTitle = user.jobTitle || user.JobTitle;
          
          this.form.patchValue({
            userId: userId,
            name: fullName,
            nameAr: fullNameAr,
            email: email
          });

          // Check if user has jobTitle
          if (jobTitleId && jobTitle) {
            // User has jobTitle - fill it and set status to Draft (user selected from backend)
            const jobTitleName = jobTitle.nameEn || jobTitle.nameAr || jobTitle.NameEn || jobTitle.NameAr || '';
            this.form.patchValue({
              jobTitle: jobTitleName,
              jobTitleId: jobTitleId
            });
            this.showDepartmentSelection = false;
            this.showJobTitleSelection = false;
          } else {
            // User doesn't have jobTitle - show department selection
            this.showDepartmentSelection = true;
            this.showJobTitleSelection = false;
            this.form.get('departmentId')?.setValidators([Validators.required]);
            this.form.get('jobTitleId')?.setValidators([Validators.required]);
            this.form.get('jobTitle')?.clearValidators();
            this.form.get('jobTitle')?.setValue('');
            this.loadDepartments();
          }
          
          // Update validators
          this.form.get('jobTitle')?.updateValueAndValidity();
          this.form.get('jobTitleId')?.updateValueAndValidity();
          this.form.get('departmentId')?.updateValueAndValidity();
        }
        this.loadingService.hide();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.toastr.error(this.translationService.instant('eventRegistration.userLoadError'));
        this.loadingService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  loadDepartments(): void {
    this.loadingService.show();
    this.departmentService.getAllDepartments().subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.departments = Array.isArray(response.result) ? response.result : [response.result];
        }
        this.loadingService.hide();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.loadingService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  onDepartmentChange(): void {
    const departmentId = this.form.get('departmentId')?.value;
    if (departmentId) {
      this.showJobTitleSelection = true;
      this.form.get('jobTitleId')?.setValidators([Validators.required]);
      this.form.get('jobTitle')?.clearValidators();
      this.form.get('jobTitle')?.setValue('');
      this.loadJobTitles(departmentId);
    } else {
      this.showJobTitleSelection = false;
      this.jobTitles = [];
      this.form.get('jobTitleId')?.setValue(null);
    }
    this.form.get('jobTitleId')?.updateValueAndValidity();
    this.form.get('jobTitle')?.updateValueAndValidity();
  }

  loadJobTitles(departmentId: number): void {
    this.loadingService.show();
    this.jobTitleService.getJobTitles(1, 1000, departmentId).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.jobTitles = Array.isArray(response.result) ? response.result : [response.result];
        }
        this.loadingService.hide();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading job titles:', error);
        this.loadingService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  onJobTitleChange(): void {
    const jobTitleId = this.form.get('jobTitleId')?.value;
    if (jobTitleId) {
      const selectedJobTitle = this.jobTitles.find(jt => jt.id === jobTitleId);
      if (selectedJobTitle) {
        this.form.patchValue({
          jobTitle: selectedJobTitle.nameEn || selectedJobTitle.nameAr || ''
        });
      }
    }
  }

  loadEventOrganizations(): void {
    this.loadingService.show();
    this.eventOrganizationService.getAllActive().subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            this.eventOrganizations = Array.isArray(response.result) ? response.result : [response.result];
            this.loadingService.hide();
            this.cdr.markForCheck();
          }, 0);
        } else {
          setTimeout(() => {
            this.eventOrganizations = [];
            this.loadingService.hide();
            this.cdr.markForCheck();
          }, 0);
        }
      },
      error: (error) => {
        console.error('Error loading event organizations:', error);
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.eventOrganizations = [];
          this.loadingService.hide();
          this.cdr.markForCheck();
        }, 0);
      }
    });
  }

  onOrganizationChange(): void {
    const orgId = this.form.get('eventOrganizationId')?.value;
    this.showOtherOrganization = orgId === 'other';
    
    if (this.showOtherOrganization) {
      this.form.get('otherOrganization')?.setValidators([Validators.required]);
      this.form.get('eventOrganizationId')?.clearValidators();
    } else {
      this.form.get('otherOrganization')?.clearValidators();
      this.form.get('otherOrganization')?.setValue('');
      this.form.get('eventOrganizationId')?.setValidators([Validators.required]);
    }
    this.form.get('otherOrganization')?.updateValueAndValidity();
    this.form.get('eventOrganizationId')?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    const formValue = this.form.value;
    const registration: EventRegistration = {
      name: formValue.name,
      nameAr: formValue.nameAr || null,
      jobTitle: formValue.jobTitle || (formValue.jobTitleId ? this.jobTitles.find(jt => jt.id === formValue.jobTitleId)?.nameEn : ''),
      eventId: this.eventId,
      eventOrganizationId: this.showOtherOrganization ? null : formValue.eventOrganizationId,
      otherOrganization: this.showOtherOrganization ? formValue.otherOrganization : null,
      phone: '', // Optional for manual registration
      email: formValue.email || '', // Fill email if available
      isManual: true,
      vipStatus: formValue.vipStatus ?? VipStatus.Attendee,
      status: this.selectedUser ? EventRegistrationStatus.Draft : EventRegistrationStatus.Approved
    };

    this.eventRegistrationService.createManual(registration).subscribe({
      next: (response) => {
        if (response.statusCode === 201 || response.statusCode === 200) {
          // Update user's department and jobTitle if they were selected
          if (this.selectedUser && (formValue.departmentId || formValue.jobTitleId)) {
            this.updateUserDepartmentAndJobTitle();
          } else {
            this.toastr.success(this.translationService.instant('eventRegistration.manualRegistrationSuccess'));
            this.loadingService.hide();
            this.dialogRef.close(true);
          }
        } else {
          this.toastr.error(response.message || this.translationService.instant('eventRegistration.manualRegistrationError'));
          this.loadingService.hide();
          this.isSubmitting = false;
        }
      },
      error: (error) => {
        this.toastr.error(error.error?.message || this.translationService.instant('eventRegistration.manualRegistrationError'));
        this.loadingService.hide();
        this.isSubmitting = false;
      }
    });
  }

  updateUserDepartmentAndJobTitle(): void {
    if (!this.selectedUser) return;

    const formValue = this.form.value;
    const updateData: any = {
      fullName: this.selectedUser.fullName || this.selectedUser.FullName,
      email: this.selectedUser.email || this.selectedUser.Email,
      organizationId: this.selectedUser.organizationId || this.selectedUser.OrganizationId,
      loginMethod: this.selectedUser.loginMethod || this.selectedUser.LoginMethod,
      emailVerified: this.selectedUser.emailVerified || this.selectedUser.EmailVerified
    };

    if (formValue.departmentId) {
      updateData.departmentId = formValue.departmentId;
    }

    if (formValue.jobTitleId) {
      updateData.jobTitleId = formValue.jobTitleId;
    }

    this.userService.updateUser(this.selectedUser.id, updateData).subscribe({
      next: (response) => {
        if (response.statusCode === 200) {
          this.toastr.success(this.translationService.instant('eventRegistration.manualRegistrationSuccess'));
          this.loadingService.hide();
          this.dialogRef.close(true);
        } else {
          this.toastr.warning(this.translationService.instant('eventRegistration.manualRegistrationSuccess') + ' ' + this.translationService.instant('eventRegistration.userUpdateWarning'));
          this.loadingService.hide();
          this.dialogRef.close(true);
        }
      },
      error: (error) => {
        this.toastr.warning(this.translationService.instant('eventRegistration.manualRegistrationSuccess') + ' ' + this.translationService.instant('eventRegistration.userUpdateWarning'));
        this.loadingService.hide();
        this.dialogRef.close(true);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-search-container')) {
      this.isUserDropdownOpen = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
