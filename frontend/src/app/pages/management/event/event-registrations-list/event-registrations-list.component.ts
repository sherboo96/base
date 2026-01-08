import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef, DialogService } from '@ngneat/dialog';
import { EventRegistrationService, EventRegistration, EventRegistrationListResponse, EventRegistrationStatus, VipStatus, EventAttendee } from '../../../../services/event-registration.service';
import { LoadingService } from '../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';
import { finalize } from 'rxjs/operators';
import { EventBadgeComponent } from '../../../../components/event-badge/event-badge.component';
import { SeatNumberDialogComponent } from './seat-number-dialog/seat-number-dialog.component';
import { EventRegistrationEditFormComponent } from './event-registration-edit-form/event-registration-edit-form.component';
import { EventRegistrationManualFormComponent } from './event-registration-manual-form/event-registration-manual-form.component';

@Component({
  selector: 'app-event-registrations-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  styles: [`
    /* Custom scrollbar for registrations table using accent colors */
    .registrations-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #0B5367 #f1f1f1;
    }

    .registrations-scrollbar::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    .registrations-scrollbar::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    .registrations-scrollbar::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #0B5367 0%, #084354 100%);
      border-radius: 4px;
      border: 2px solid transparent;
      background-clip: padding-box;
      transition: all 0.3s ease;
    }

    .registrations-scrollbar::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #084354 0%, #063240 100%);
      background-clip: padding-box;
      box-shadow: 0 2px 4px rgba(11, 83, 103, 0.3);
    }

    .registrations-scrollbar::-webkit-scrollbar-thumb:active {
      background: linear-gradient(180deg, #063240 0%, #05202a 100%);
      background-clip: padding-box;
    }

    .registrations-scrollbar::-webkit-scrollbar-corner {
      background: #f1f1f1;
    }
  `],
  template: `
    <div class="p-8 max-h-[90vh] flex flex-col w-full">
      <!-- Header Section -->
      <div class="mb-8">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-accent/10 rounded-lg">
              <i class="fas fa-users text-accent text-xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-textDark font-poppins">
                {{ 'event.registrations' | translate }}
              </h2>
              <p class="text-sm text-gray-600 mt-1 font-poppins">
                {{ 'event.registrationsDescription' | translate }}
              </p>
            </div>
          </div>
          <!-- Status Counts and Add Manual Button -->
          <div class="flex items-center gap-3">
            <button
              (click)="addManualRegistration()"
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-accent rounded-lg text-accent bg-white hover:bg-accent/10 hover:border-accentDark transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium font-poppins text-sm whitespace-nowrap"
              [title]="'eventRegistration.addManualRegistration' | translate"
            >
              <i class="fas fa-user-plus text-accent"></i>
              <span>{{ 'eventRegistration.addManual' | translate }}</span>
            </button>
            <div class="flex items-center gap-2 px-3 py-2 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <i class="fas fa-file-alt text-yellow-600 text-sm"></i>
              <span class="text-xs font-semibold text-yellow-800 font-poppins">{{ 'eventRegistration.statusDraft' | translate }}:</span>
              <span class="text-sm font-bold text-yellow-900 font-poppins">{{ draftCount }}</span>
            </div>
            <div class="flex items-center gap-2 px-3 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
              <i class="fas fa-check-circle text-green-600 text-sm"></i>
              <span class="text-xs font-semibold text-green-800 font-poppins">{{ 'eventRegistration.statusApproved' | translate }}:</span>
              <span class="text-sm font-bold text-green-900 font-poppins">{{ approvedCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Export -->
      <div class="mb-6">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="relative flex-1 min-w-[200px]">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (keyup.enter)="onSearch()"
              [placeholder]="'event.searchRegistrations' | translate"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins"
            />
          </div>
          <div class="relative min-w-[180px]">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-filter text-gray-400"></i>
            </div>
            <select
              [(ngModel)]="statusFilter"
              (change)="onStatusFilterChange()"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-8 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white appearance-none cursor-pointer"
            >
              <option [ngValue]="null">{{ 'eventRegistration.allStatuses' | translate }}</option>
              <option [ngValue]="EventRegistrationStatus.Draft">{{ 'eventRegistration.statusDraft' | translate }}</option>
              <option [ngValue]="EventRegistrationStatus.Approved">{{ 'eventRegistration.statusApproved' | translate }}</option>
              <option [ngValue]="EventRegistrationStatus.Rejected">{{ 'eventRegistration.statusRejected' | translate }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
            </div>
          </div>
          <div class="relative min-w-[200px]">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-building text-gray-400"></i>
            </div>
            <select
              [(ngModel)]="organizationFilter"
              (change)="onOrganizationFilterChange()"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-8 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white appearance-none cursor-pointer"
            >
              <option [ngValue]="null">{{ 'eventRegistration.allOrganizations' | translate }}</option>
              <option *ngFor="let org of availableOrganizations" [ngValue]="org">
                {{ org }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
            </div>
          </div>
          <div class="relative min-w-[150px]">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-star text-gray-400"></i>
            </div>
            <select
              [(ngModel)]="vipStatusFilter"
              (change)="onFilterChange()"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-8 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white appearance-none cursor-pointer"
            >
              <option [ngValue]="null">{{ 'eventRegistration.allVip' | translate }}</option>
              <option [ngValue]="VipStatus.Attendee">{{ 'eventRegistration.attendee' | translate }}</option>
              <option [ngValue]="VipStatus.Vip">{{ 'eventRegistration.vip' | translate }}</option>
              <option [ngValue]="VipStatus.VVip">{{ 'eventRegistration.vVip' | translate }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
            </div>
          </div>
          <div class="relative min-w-[150px]">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-user-plus text-gray-400"></i>
            </div>
            <select
              [(ngModel)]="isManualFilter"
              (change)="onFilterChange()"
              class="form-control w-full border-2 border-gray-300 rounded-lg py-2.5 pl-10 pr-8 text-sm focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 font-poppins bg-white appearance-none cursor-pointer"
            >
              <option [ngValue]="null">{{ 'eventRegistration.allManual' | translate }}</option>
              <option [ngValue]="true">{{ 'eventRegistration.isManual' | translate }}</option>
              <option [ngValue]="false">{{ 'eventRegistration.notManual' | translate }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="exportToExcel()"
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-blue-500 rounded-lg text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium font-poppins text-sm whitespace-nowrap"
              [title]="'eventRegistration.exportAll' | translate"
            >
              <i class="fas fa-file-excel text-blue-500"></i>
              <span>{{ 'eventRegistration.exportAll' | translate }}</span>
            </button>
            <button
              (click)="exportToExcelWithoutMainOrg()"
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-blue-500 rounded-lg text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium font-poppins text-sm whitespace-nowrap"
              [title]="'eventRegistration.exportWithoutMainOrg' | translate"
            >
              <i class="fas fa-file-excel text-blue-500"></i>
              <span>{{ 'eventRegistration.exportWithoutMainOrg' | translate }}</span>
            </button>
            <button
              (click)="printAllBadges()"
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-purple-500 rounded-lg text-purple-600 bg-white hover:bg-purple-50 hover:border-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium font-poppins text-sm whitespace-nowrap"
              [title]="'eventRegistration.printAllBadges' | translate"
            >
              <i class="fas fa-print text-purple-500"></i>
              <span>{{ 'eventRegistration.printAllBadges' | translate }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Registrations Table - Grouped by Organization (Scrollable) -->
      <div *ngIf="registrations.length > 0" class="flex-1 overflow-y-auto registrations-scrollbar space-y-6 min-h-0">
        <div *ngFor="let orgName of organizationNames" class="border-2 border-gray-300 rounded-lg overflow-hidden">
          <!-- Organization Header -->
          <div class="bg-accent/10 px-4 py-3 border-b-2 border-gray-300">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="fas fa-building text-accent text-lg"></i>
                <h3 class="text-lg font-semibold text-gray-900 font-poppins">{{ orgName }}</h3>
                <span class="px-2 py-1 bg-accent/20 text-accent rounded-full text-xs font-medium">
                  {{ getOrganizationCount(orgName) }} {{ 'eventRegistration.registrations' | translate }}
                </span>
              </div>
              <button
                (click)="exportOrganizationToExcel(orgName)"
                class="inline-flex items-center gap-2 px-4 py-2 border-2 border-blue-500 rounded-lg text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium font-poppins text-xs whitespace-nowrap"
                [title]="'eventRegistration.exportOrganization' | translate"
              >
                <i class="fas fa-file-excel text-sm text-blue-500"></i>
                <span>{{ 'eventRegistration.exportOrganization' | translate }}</span>
              </button>
            </div>
          </div>

          <!-- Registrations Table for this Organization -->
          <div class="overflow-x-auto" style="overflow-y: visible;">
            <table class="min-w-full divide-y divide-gray-200" style="position: relative;">
              <thead class="bg-gray-100">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-user mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.name' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-phone mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.phone' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-envelope mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.email' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-briefcase mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.jobTitle' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-barcode mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.barcode' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-chair mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.seatNumber' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-info-circle mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.status' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-center text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-star mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.isVip' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-envelope mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.emailStatus' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-sign-in-alt mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.checkIn' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-sign-out-alt mr-1.5 text-accent text-xs"></i>{{ 'eventRegistration.checkOut' | translate }}
                  </th>
                  <th scope="col" class="px-4 py-3 text-right text-xs font-bold text-darkGray uppercase tracking-wider">
                    <i class="fas fa-cog mr-1.5 text-accent text-xs"></i>{{ 'common.actions' | translate }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let registration of getRegistrationsForOrganization(orgName)" 
                    class="hover:bg-gray-50 transition-all duration-150"
                    (click)="onTableRowClick($event)">
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-xs text-gray-900 font-medium">{{ registration.name }}</div>
                  <div *ngIf="registration.nameAr" class="text-xs text-gray-500" dir="rtl">{{ registration.nameAr }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                  {{ registration.phone }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                  {{ registration.email }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                  {{ registration.jobTitle || '-' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-mono">
                  {{ registration.barcode || '-' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                  <div class="flex items-center gap-2">
                    <span *ngIf="registration.seatNumber" class="font-semibold text-accent">{{ registration.seatNumber }}</span>
                    <button
                      *ngIf="registration.seatNumber && normalizeStatus(registration.status) === 1"
                      (click)="editSeatNumber(registration)"
                      class="inline-flex items-center justify-center px-1.5 py-1 border border-accent rounded text-accent bg-white hover:bg-accent hover:text-white transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-accent focus:ring-opacity-50 text-xs"
                      [title]="'eventRegistration.editSeatNumber' | translate"
                    >
                      <i class="fas fa-edit text-xs"></i>
                    </button>
                    <button
                      *ngIf="!registration.seatNumber && normalizeStatus(registration.status) === 1"
                      (click)="editSeatNumber(registration)"
                      class="inline-flex items-center px-2 py-1 border-2 border-accent rounded-lg text-accent bg-white hover:bg-accent hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 shadow-sm hover:shadow-md text-xs font-medium whitespace-nowrap"
                      [title]="'eventRegistration.addSeatNumber' | translate"
                    >
                      <i class="fas fa-plus mr-1 text-xs"></i>
                      <span>{{ 'eventRegistration.addSeatNumber' | translate }}</span>
                    </button>
                    <span *ngIf="!registration.seatNumber && normalizeStatus(registration.status) !== 1" class="text-gray-400">-</span>
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs">
                  <div class="flex items-center gap-2 flex-wrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-yellow-100 text-yellow-800': normalizeStatus(registration.status) === 0,
                      'bg-green-100 text-green-800': normalizeStatus(registration.status) === 1,
                      'bg-red-100 text-red-800': normalizeStatus(registration.status) === 2
                    }"
                  >
                    <span *ngIf="normalizeStatus(registration.status) === 0">{{ 'eventRegistration.statusDraft' | translate }}</span>
                    <span *ngIf="normalizeStatus(registration.status) === 1">{{ 'eventRegistration.statusApproved' | translate }}</span>
                    <span *ngIf="normalizeStatus(registration.status) === 2">{{ 'eventRegistration.statusRejected' | translate }}</span>
                  </span>
                  <span
                    *ngIf="normalizeVipStatus(registration.vipStatus) !== VipStatus.Attendee"
                    [class]="'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + getVipStatusClass(registration.vipStatus)"
                  >
                    <i class="fas fa-star mr-1 text-xs"></i>
                    {{ getVipStatusLabel(registration.vipStatus) }}
                  </span>
                  <span
                    *ngIf="registration.isManual"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <i class="fas fa-user-plus mr-1 text-xs"></i>
                    {{ 'eventRegistration.isManual' | translate }}
                  </span>
                  
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-center" style="position: relative;">
                  <div class="relative inline-block">
                    <button
                      type="button"
                      (click)="toggleVipStatusMenu(registration.id!, $event)"
                      [class]="'vip-status-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow-sm hover:shadow-md ' + getVipStatusButtonClass(registration.vipStatus)"
                      [title]="'eventRegistration.vipStatus' | translate"
                    >
                      <i class="fas fa-star text-xs"></i>
                      <span>{{ getVipStatusLabel(registration.vipStatus) }}</span>
                      <i class="fas fa-chevron-down text-xs ml-1"></i>
                    </button>
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs" style="position: relative; z-index: 1;">
                  <button
                    (click)="toggleEmailStatus(registration.id!, $event)"
                    class="email-status-button inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-200"
                    [ngClass]="{
                      'bg-green-100 text-green-800 hover:bg-green-200': getTotalEmailsSent(registration) > 0,
                      'bg-gray-100 text-gray-600 hover:bg-gray-200': getTotalEmailsSent(registration) === 0
                    }"
                    [title]="'eventRegistration.viewEmailStatus' | translate"
                  >
                    <i class="fas mr-1 text-xs" [ngClass]="getTotalEmailsSent(registration) > 0 ? 'fa-envelope-open' : 'fa-envelope'"></i>
                    <span>{{ getTotalEmailsSent(registration) }}/3</span>
                  </button>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs">
                  <div *ngIf="getLatestCheckIn(registration)" class="flex flex-col">
                    <span class="text-green-700 font-medium">
                      <i class="fas fa-check-circle mr-1"></i>{{ formatDateTime(getLatestCheckIn(registration)?.checkInDateTime) }}
                    </span>
                  </div>
                  <span *ngIf="!getLatestCheckIn(registration)" class="text-gray-400">
                    <i class="fas fa-minus mr-1"></i>{{ 'eventRegistration.notCheckedIn' | translate }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs">
                  <div *ngIf="getLatestCheckIn(registration)?.checkOutDateTime" class="flex flex-col">
                    <span class="text-orange-700 font-medium">
                      <i class="fas fa-check-circle mr-1"></i>{{ formatDateTime(getLatestCheckIn(registration)?.checkOutDateTime) }}
                    </span>
                  </div>
                  <span *ngIf="!getLatestCheckIn(registration)?.checkOutDateTime && getLatestCheckIn(registration)" class="text-gray-500">
                    <i class="fas fa-clock mr-1"></i>{{ 'eventRegistration.notCheckedOut' | translate }}
                  </span>
                  <span *ngIf="!getLatestCheckIn(registration)" class="text-gray-400">
                    <i class="fas fa-minus mr-1"></i>-
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-xs font-medium" style="position: relative; overflow: visible;">
                  <div class="flex items-center justify-end gap-2">
                    <!-- Print Badge Button -->
                    <button
                      *ngIf="registration.barcode"
                      (click)="printBadge(registration); $event.stopPropagation()"
                      class="inline-flex items-center px-3 py-2 border-2 border-purple-500 rounded-lg text-purple-600 bg-white hover:bg-purple-50 hover:border-purple-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium text-xs"
                      [title]="'eventRegistration.printBadge' | translate"
                    >
                      <i class="fas fa-print mr-1.5 text-xs text-purple-500"></i>
                      <span>{{ 'eventRegistration.printBadge' | translate }}</span>
                    </button>
                    <!-- Approve Button -->
                    <button
                      *ngIf="normalizeStatus(registration.status) === 0"
                      (click)="approveRegistration(registration); $event.stopPropagation()"
                      class="inline-flex items-center px-3 py-2 border-2 border-green-500 rounded-lg text-green-600 bg-white hover:bg-green-50 hover:border-green-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium text-xs"
                      [title]="'eventRegistration.approve' | translate"
                    >
                      <i class="fas fa-check mr-1.5 text-xs text-green-500"></i>
                      <span>{{ 'eventRegistration.approve' | translate }}</span>
                    </button>
                    <!-- Reject Button -->
                    <button
                      *ngIf="normalizeStatus(registration.status) === 0"
                      (click)="rejectRegistration(registration); $event.stopPropagation()"
                      class="inline-flex items-center px-3 py-2 border-2 border-red-500 rounded-lg text-red-600 bg-white hover:bg-red-50 hover:border-red-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium text-xs"
                      [title]="'eventRegistration.reject' | translate"
                    >
                      <i class="fas fa-times mr-1.5 text-xs text-red-500"></i>
                      <span>{{ 'eventRegistration.reject' | translate }}</span>
                    </button>
                    <!-- 3 Dots Menu -->
                    <div class="relative" style="z-index: 1;">
                      <button
                        (click)="toggleMenu(registration.id!, $event)"
                        class="actions-menu-button inline-flex items-center justify-center px-2.5 py-2 border-2 border-gray-300 rounded-lg text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium text-xs"
                        [title]="'common.moreActions' | translate"
                      >
                        <i class="fas fa-ellipsis-v text-xs"></i>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="registrations.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-12 px-3 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div class="mb-3">
          <i class="fas fa-users text-gray-300 text-4xl"></i>
        </div>
        <h3 class="text-xl font-semibold text-gray-700 mb-1">
          {{ 'event.noRegistrationsFound' | translate }}
        </h3>
        <p class="text-xs text-gray-500">
          {{ 'event.noRegistrationsMatching' | translate }}
        </p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
          <p class="text-gray-700 font-poppins">{{ 'common.loading' | translate }}</p>
        </div>
      </div>

      <!-- Pagination -->
      <div *ngIf="registrations.length > 0 && totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between bg-gray-50 p-3 border-t-2 border-gray-200 mt-4 rounded-lg">
        <div class="text-xs font-medium text-darkGray mb-2 sm:mb-0">
          <i class="fas fa-info-circle mr-1.5 text-accent text-xs"></i>
          {{ 'common.showing' | translate : paginationParams }}
        </div>
        <div class="flex items-center space-x-2">
          <select [(ngModel)]="pageSize" (change)="onPageSizeChange()" class="text-xs border-2 border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-white shadow-sm font-medium">
            <option [value]="50">50 {{ 'common.perPage' | translate }}</option>
            <option [value]="100">100 {{ 'common.perPage' | translate }}</option>
            <option [value]="200">200 {{ 'common.perPage' | translate }}</option>
          </select>
          <div class="flex space-x-1">
            <button class="px-2 py-1 rounded-lg border-2 border-gray-300 text-xs font-medium hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md" [disabled]="currentPage === 1" (click)="goToPage(1)" [title]="'common.firstPage' | translate">
              <i class="fas fa-angle-double-left text-xs"></i>
            </button>
            <button class="px-2 py-1 rounded-lg border-2 border-gray-300 text-xs font-medium hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)" [title]="'common.previousPage' | translate">
              <i class="fas fa-chevron-left text-xs"></i>
            </button>
            <div class="flex space-x-1">
              <button *ngFor="let page of getPageNumbers()" (click)="goToPage(page)" class="px-3 py-1 rounded-lg border-2 text-xs min-w-[36px] font-medium transition-all duration-200 shadow-sm hover:shadow-md" [ngClass]="{'bg-accentDark text-white border-accent shadow-md': currentPage === page, 'border-gray-300 hover:bg-gray-100 hover:border-gray-400': currentPage !== page}">
                {{ page }}
              </button>
            </div>
            <button class="px-2 py-1 rounded-lg border-2 border-gray-300 text-xs font-medium hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)" [title]="'common.nextPage' | translate">
              <i class="fas fa-chevron-right text-xs"></i>
            </button>
            <button class="px-2 py-1 rounded-lg border-2 border-gray-300 text-xs font-medium hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md" [disabled]="currentPage === totalPages" (click)="goToPage(totalPages)" [title]="'common.lastPage' | translate">
              <i class="fas fa-angle-double-right text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Close Button -->
      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
        <button
          type="button"
          (click)="onClose()"
          class="px-6 py-2.5 bg-accentDark text-white rounded-lg hover:bg-accentDarker transition-all duration-200 shadow-md hover:shadow-lg font-medium font-poppins"
        >
          {{ 'common.close' | translate }}
        </button>
      </div>
    </div>
    
    <!-- VIP Status Dropdown Menu (rendered outside table) -->
    <div
      *ngIf="openVipMenuId && getCurrentVipRegistration()"
      class="fixed bg-white rounded-lg shadow-xl border-2 border-gray-200 py-1 min-w-[140px] vip-status-dropdown"
      [style.top.px]="vipMenuPosition.top"
      [style.right.px]="vipMenuPosition.right"
      style="z-index: 10000; margin-top: 0;"
      (click)="$event.stopPropagation()"
    >
      <ng-container *ngIf="getCurrentVipRegistration() as registration">
        <button
          type="button"
          (click)="updateVipStatusTo(registration, VipStatus.Attendee); $event.stopPropagation()"
          class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
          [class.bg-gray-100]="normalizeVipStatus(registration.vipStatus) === VipStatus.Attendee"
        >
          <i class="fas fa-user text-gray-400 text-xs"></i>
          <span>{{ 'eventRegistration.attendee' | translate }}</span>
          <i *ngIf="normalizeVipStatus(registration.vipStatus) === VipStatus.Attendee" class="fas fa-check text-accent ml-auto"></i>
        </button>
        <button
          type="button"
          (click)="updateVipStatusTo(registration, VipStatus.Vip); $event.stopPropagation()"
          class="w-full text-left px-4 py-2 text-xs text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-2"
          [class.bg-purple-50]="normalizeVipStatus(registration.vipStatus) === VipStatus.Vip"
        >
          <i class="fas fa-star text-purple-500 text-xs"></i>
          <span>{{ 'eventRegistration.vip' | translate }}</span>
          <i *ngIf="normalizeVipStatus(registration.vipStatus) === VipStatus.Vip" class="fas fa-check text-purple-600 ml-auto"></i>
        </button>
        <button
          type="button"
          (click)="updateVipStatusTo(registration, VipStatus.VVip); $event.stopPropagation()"
          class="w-full text-left px-4 py-2 text-xs text-indigo-700 hover:bg-indigo-50 transition-colors flex items-center gap-2"
          [class.bg-indigo-50]="normalizeVipStatus(registration.vipStatus) === VipStatus.VVip"
        >
          <i class="fas fa-star text-indigo-500 text-xs"></i>
          <span>{{ 'eventRegistration.vVip' | translate }}</span>
          <i *ngIf="normalizeVipStatus(registration.vipStatus) === VipStatus.VVip" class="fas fa-check text-indigo-600 ml-auto"></i>
        </button>
      </ng-container>
    </div>
    
    <!-- Dropdown Menu (rendered outside table) -->
    <div
      *ngIf="openMenuId && getCurrentRegistration()"
      class="fixed w-48 bg-white rounded-lg shadow-xl border-2 border-gray-200 py-1"
      [style.top.px]="menuPosition.top"
      [style.right.px]="menuPosition.right"
      style="z-index: 10000;"
      (click)="$event.stopPropagation()"
    >
      <ng-container *ngIf="getCurrentRegistration() as registration">
        <button
          *ngIf="registration.barcode"
          (click)="showBadge(registration); closeMenu()"
          class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <i class="fas fa-id-card text-blue-500"></i>
          <span>{{ 'eventRegistration.showBadge' | translate }}</span>
        </button>
        <button
          *ngIf="normalizeStatus(registration.status) === 1 && !registration.isManual"
          (click)="resendEmail(registration); closeMenu()"
          class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <i class="fas fa-paper-plane text-purple-500"></i>
          <span>{{ 'eventRegistration.resendEmail' | translate }}</span>
        </button>
        <hr class="my-1 border-gray-200">
        <button
          (click)="editRegistration(registration); closeMenu()"
          class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <i class="fas fa-edit text-blue-500"></i>
          <span>{{ 'eventRegistration.edit' | translate }}</span>
        </button>
        <button
          (click)="deleteRegistration(registration); closeMenu()"
          class="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
        >
          <i class="fas fa-trash text-red-500"></i>
          <span>{{ 'common.delete' | translate }}</span>
        </button>
      </ng-container>
    </div>
    
    <!-- Email Status Tooltip -->
    <div
      *ngIf="openEmailStatusId && getCurrentRegistrationForEmailStatus()"
      class="fixed bg-white rounded-lg shadow-xl border-2 border-gray-200 py-3 px-4 email-status-tooltip"
      [style.top.px]="emailStatusPosition.top"
      [style.right.px]="emailStatusPosition.right"
      style="z-index: 10000; min-width: 280px;"
      (click)="$event.stopPropagation()"
    >
      <ng-container *ngIf="getCurrentRegistrationForEmailStatus() as registration">
        <div class="mb-2 pb-2 border-b border-gray-200">
          <h4 class="text-sm font-semibold text-gray-900 font-poppins">
            {{ 'eventRegistration.emailStatus' | translate }}
          </h4>
        </div>
        <div class="space-y-2">
          <!-- Registration Successful Email -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                [ngClass]="{
                  'bg-green-100 text-green-800': registration.registrationSuccessfulEmailSent,
                  'bg-gray-100 text-gray-600': !registration.registrationSuccessfulEmailSent
                }"
              >
                <i class="fas mr-1 text-xs" [ngClass]="registration.registrationSuccessfulEmailSent ? 'fa-check-circle' : 'fa-times-circle'"></i>
                <span>{{ 'eventRegistration.registrationSuccessfulEmail' | translate }}</span>
              </span>
            </div>
            <span *ngIf="registration.registrationSuccessfulEmailSentAt" class="text-xs text-gray-500">
              {{ formatDateTime(registration.registrationSuccessfulEmailSentAt) }}
            </span>
          </div>
          <!-- Confirmation Email -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                [ngClass]="{
                  'bg-green-100 text-green-800': registration.confirmationEmailSent,
                  'bg-gray-100 text-gray-600': !registration.confirmationEmailSent
                }"
              >
                <i class="fas mr-1 text-xs" [ngClass]="registration.confirmationEmailSent ? 'fa-check-circle' : 'fa-times-circle'"></i>
                <span>{{ 'eventRegistration.confirmationEmail' | translate }}</span>
              </span>
            </div>
            <span *ngIf="registration.confirmationEmailSentAt" class="text-xs text-gray-500">
              {{ formatDateTime(registration.confirmationEmailSentAt) }}
            </span>
          </div>
          <!-- Final Approval Email -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                [ngClass]="{
                  'bg-green-100 text-green-800': registration.finalApprovalEmailSent,
                  'bg-gray-100 text-gray-600': !registration.finalApprovalEmailSent
                }"
              >
                <i class="fas mr-1 text-xs" [ngClass]="registration.finalApprovalEmailSent ? 'fa-check-circle' : 'fa-times-circle'"></i>
                <span>{{ 'eventRegistration.finalApprovalEmail' | translate }}</span>
              </span>
            </div>
            <span *ngIf="registration.finalApprovalEmailSentAt" class="text-xs text-gray-500">
              {{ formatDateTime(registration.finalApprovalEmailSentAt) }}
            </span>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class EventRegistrationsListComponent implements OnInit {
  registrations: EventRegistration[] = [];
  groupedRegistrations: { [key: string]: EventRegistration[] } = {};
  organizationNames: string[] = [];
  isLoading = false;
  pageSize = 200;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  statusFilter: EventRegistrationStatus | null = null;
  organizationFilter: string | null = null;
  vipStatusFilter: VipStatus | null = null;
  isManualFilter: boolean | null = null;
  availableOrganizations: string[] = [];
  eventId: number;
  eventName: string;
  
  // Expose VipStatus enum to template
  VipStatus = VipStatus;
  openMenuId: number | null = null;
  menuPosition: { top: number; right: number } = { top: 0, right: 0 };
  openEmailStatusId: number | null = null;
  emailStatusPosition: { top: number; right: number } = { top: 0, right: 0 };
  openVipMenuId: number | null = null;
  vipMenuPosition: { top: number; right: number } = { top: 0, right: 0 };
  
  // Cached counts to avoid ExpressionChangedAfterItHasBeenCheckedError
  draftCount = 0;
  approvedCount = 0;
  
  // Expose EventRegistrationStatus to template
  EventRegistrationStatus = EventRegistrationStatus;

  constructor(
    public dialogRef: DialogRef<{ eventId: number; eventName: string }>,
    private eventRegistrationService: EventRegistrationService,
    public loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef
  ) {
    this.eventId = this.dialogRef.data?.eventId || 0;
    this.eventName = this.dialogRef.data?.eventName || 'Event';
  }

  ngOnInit(): void {
    this.fetchAllOrganizations();
    this.fetchRegistrations();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Close actions menu if clicking outside
    if (!target.closest('.actions-menu-button') && !target.closest('.fixed.w-48')) {
      this.closeMenu();
    }
    
    // Close email status tooltip if clicking outside
    if (!target.closest('.email-status-button') && !target.closest('.email-status-tooltip')) {
      this.closeEmailStatus();
    }
    
    // Close VIP menu if clicking outside
    if (!target.closest('.vip-status-button') && !target.closest('.vip-status-dropdown')) {
      this.closeVipMenu();
    }
  }

  fetchRegistrations(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.eventRegistrationService
      .getAll(
        this.currentPage,
        this.pageSize,
        this.searchTerm || undefined,
        this.eventId,
        this.statusFilter !== null ? this.statusFilter : undefined
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response: EventRegistrationListResponse) => {
          let filteredRegistrations = response.result;
          
          // Apply VIP status filter
          if (this.vipStatusFilter !== null) {
            filteredRegistrations = filteredRegistrations.filter(r => {
              const regVipStatus = this.normalizeVipStatus(r.vipStatus);
              return regVipStatus === this.vipStatusFilter;
            });
          }
          
          // Apply IsManual filter
          if (this.isManualFilter !== null) {
            filteredRegistrations = filteredRegistrations.filter(r => r.isManual === this.isManualFilter);
          }
          
          this.registrations = filteredRegistrations;
          this.totalItems = filteredRegistrations.length;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.updateAvailableOrganizations();
          this.updateCounts();
          this.groupRegistrationsByOrganization();
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('common.error')
          );
        },
      });
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchRegistrations();
  }

  getPageNumbers(): number[] {
    const maxVisiblePages = 5;
    const pages: number[] = [];
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.fetchRegistrations();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchRegistrations();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.fetchRegistrations();
  }

  onOrganizationFilterChange(): void {
    this.currentPage = 1;
    this.fetchRegistrations();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.fetchRegistrations();
  }

  fetchAllOrganizations(): void {
    // Fetch all registrations (with a very large pageSize) just to get all unique organizations
    this.eventRegistrationService
      .getAll(
        1,
        10000, // Very large page size to get all registrations
        undefined, // search
        this.eventId,
        undefined // status
      )
      .subscribe({
        next: (response: EventRegistrationListResponse) => {
          const orgSet = new Set<string>();
          response.result.forEach(reg => {
            const orgName = reg.eventOrganization?.name || 'No Organization';
            orgSet.add(orgName);
          });
          this.availableOrganizations = Array.from(orgSet).sort();
        },
        error: (error) => {
          console.error('Error fetching all organizations:', error);
          // Fallback to current registrations if the large fetch fails
          this.updateAvailableOrganizations();
        }
      });
  }

  updateAvailableOrganizations(): void {
    const orgSet = new Set<string>();
    this.registrations.forEach(reg => {
      const orgName = reg.eventOrganization?.name || 'No Organization';
      orgSet.add(orgName);
    });
    // Merge with existing availableOrganizations to ensure we don't lose any
    this.availableOrganizations.forEach(org => orgSet.add(org));
    this.availableOrganizations = Array.from(orgSet).sort();
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }

  onClose(): void {
    this.dialogRef.close();
  }

  getLatestCheckIn(registration: EventRegistration): EventAttendee | null {
    if (!registration.attendees || registration.attendees.length === 0) {
      return null;
    }
    
    // Get the most recent check-in (by checkInDateTime)
    const checkedInAttendees = registration.attendees
      .filter(a => a.checkInDateTime)
      .sort((a, b) => {
        const dateA = a.checkInDateTime ? new Date(a.checkInDateTime).getTime() : 0;
        const dateB = b.checkInDateTime ? new Date(b.checkInDateTime).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    
    return checkedInAttendees.length > 0 ? checkedInAttendees[0] : null;
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) {
      return '-';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      // Format: DD/MM/YYYY HH:MM
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  }

  showBadge(registration: EventRegistration): void {
    if (!registration.barcode && !registration.id) {
      this.toastr.error(this.translationService.instant('eventRegistration.noBarcode'));
      return;
    }

    const badgeDialogRef = this.dialogService.open(EventBadgeComponent, {
      data: {
        registrationId: registration.id,
        barcode: registration.barcode,
        name: registration.name
      },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'md',
    });
  }

  printBadge(registration: EventRegistration): void {
    if (!registration.barcode) {
      this.toastr.error(this.translationService.instant('eventRegistration.noBarcode'));
      return;
    }

    // Create a print-optimized window
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      this.toastr.error('Please allow popups to print badges');
      return;
    }

    const barcode = registration.barcode;
    const name = registration.name || '';

    // Create print-optimized HTML
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Badge - ${name}</title>
          <style>
            @page {
              size: 3.375in 2.125in;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Poppins', Arial, sans-serif;
              width: 3.375in;
              height: 2.125in;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              padding: 0.2in 0.2in 0.1in 0.2in;
              padding-top: 0.4in;
              background: white;
            }
            .badge-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              gap: 8px;
              margin-top: 0.2in;
            }
            .qr-code {
              width: 120px;
              height: 120px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-code img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .barcode-text {
              font-size: 14px;
              font-weight: bold;
              color: #333;
              text-align: center;
              font-family: 'Courier New', monospace;
              letter-spacing: 1px;
            }
            .name {
              font-size: 18px;
              font-weight: bold;
              color: #000;
              text-align: center;
              margin-top: 4px;
            }
            @media print {
              body {
                width: 3.375in;
                height: 2.125in;
              }
              .badge-container {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="badge-container">
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(barcode)}" alt="QR Code" />
            </div>
            <div class="barcode-text">${barcode}</div>
            <div class="name">${name}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  printAllBadges(): void {
    // Get all filtered registrations that have barcodes
    const registrationsWithBarcodes = this.registrations.filter(r => r.barcode);
    
    if (registrationsWithBarcodes.length === 0) {
      this.toastr.warning(this.translationService.instant('eventRegistration.noBadgesToPrint'));
      return;
    }

    // Show info message
    this.toastr.info(
      this.translationService.instant('eventRegistration.printingBadges', { count: registrationsWithBarcodes.length }),
      '',
      { timeOut: 3000 }
    );

    // Print badges one by one with a delay between each
    let currentIndex = 0;
    const printDelay = 2000; // 2 seconds delay between each print

    const printNextBadge = () => {
      if (currentIndex >= registrationsWithBarcodes.length) {
        // All badges printed
        this.toastr.success(
          this.translationService.instant('eventRegistration.allBadgesPrinted', { count: registrationsWithBarcodes.length })
        );
        return;
      }

      const registration = registrationsWithBarcodes[currentIndex];
      const barcode = registration.barcode || '';
      const name = registration.name || '';

      // Create a print-optimized window for this badge
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) {
        this.toastr.error('Please allow popups to print badges');
        return;
      }

      // Create print-optimized HTML for single badge
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Badge - ${name}</title>
            <style>
              @page {
                size: 3.375in 2.125in;
                margin: 0;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Poppins', Arial, sans-serif;
                width: 3.375in;
                height: 2.125in;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                padding: 0.2in 0.2in 0.1in 0.2in;
                padding-top: 0.4in;
                background: white;
              }
              .badge-container {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                gap: 8px;
                margin-top: 0.2in;
              }
              .qr-code {
                width: 120px;
                height: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .qr-code img {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }
              .barcode-text {
                font-size: 14px;
                font-weight: bold;
                color: #333;
                text-align: center;
                font-family: 'Courier New', monospace;
                letter-spacing: 1px;
              }
              .name {
                font-size: 18px;
                font-weight: bold;
                color: #000;
                text-align: center;
                margin-top: 4px;
              }
              @media print {
                body {
                  width: 3.375in;
                  height: 2.125in;
                }
                .badge-container {
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="badge-container">
              <div class="qr-code">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(barcode)}" alt="QR Code" />
              </div>
              <div class="barcode-text">${barcode}</div>
              <div class="name">${name}</div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  // Close window after print dialog is handled
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Move to next badge after delay
      currentIndex++;
      
      // Schedule next badge print
      if (currentIndex < registrationsWithBarcodes.length) {
        setTimeout(() => {
          printNextBadge();
        }, printDelay);
      } else {
        // All badges queued for printing
        setTimeout(() => {
          this.toastr.success(
            this.translationService.instant('eventRegistration.allBadgesPrinted', { count: registrationsWithBarcodes.length })
          );
        }, printDelay);
      }
    };

    // Start printing the first badge
    printNextBadge();
  }

  approveRegistration(registration: EventRegistration): void {
    if (!registration.id) {
      return;
    }

    // Show info toastr that email is being sent
    const infoToast = this.toastr.info(
      this.translationService.instant('eventRegistration.sendingEmail'),
      this.translationService.instant('eventRegistration.approving'),
      { timeOut: 0, extendedTimeOut: 0, closeButton: true, disableTimeOut: true }
    );

    this.eventRegistrationService.approve(registration.id).subscribe({
      next: (response) => {
        // Close the info toastr
        if (infoToast && infoToast.toastId) {
          this.toastr.remove(infoToast.toastId);
        }
        
        // Show success message
        this.toastr.success(
          response.message || this.translationService.instant('eventRegistration.approveSuccess')
        );
        
        // Reload registrations to get updated data
        this.fetchRegistrations();
      },
      error: (error) => {
        // Close the info toastr
        if (infoToast && infoToast.toastId) {
          this.toastr.remove(infoToast.toastId);
        }
        
        // Show error message
        this.toastr.error(
          error.error?.message || this.translationService.instant('eventRegistration.approveError')
        );
      },
    });
  }

  rejectRegistration(registration: EventRegistration): void {
    if (!registration.id) {
      return;
    }

    this.loadingService.show();
    this.eventRegistrationService.reject(registration.id).subscribe({
      next: (response) => {
        this.loadingService.hide();
        this.toastr.success(
          response.message || this.translationService.instant('eventRegistration.rejectSuccess')
        );
        // Reload registrations to get updated data
        this.fetchRegistrations();
      },
      error: (error) => {
        this.loadingService.hide();
        this.toastr.error(
          error.error?.message || this.translationService.instant('eventRegistration.rejectError')
        );
      },
    });
  }

  deleteRegistration(registration: EventRegistration): void {
    if (!registration.id) {
      return;
    }

    // Show confirmation dialog
    const confirmMessage = this.translationService.instant('common.deleteConfirm', { item: registration.name });
    if (!confirm(confirmMessage)) {
      return;
    }

    this.loadingService.show();
    this.eventRegistrationService.delete(registration.id).subscribe({
      next: (response) => {
        this.loadingService.hide();
        this.toastr.success(
          response.message || this.translationService.instant('common.delete') + ' ' + this.translationService.instant('common.success')
        );
        // Remove from local array
        this.registrations = this.registrations.filter(r => r.id !== registration.id);
        this.updateCounts();
        this.totalItems--;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        // Re-group registrations
        this.groupRegistrationsByOrganization();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loadingService.hide();
        this.toastr.error(
          error.error?.message || this.translationService.instant('common.error')
        );
      },
    });
  }

  resendEmail(registration: EventRegistration): void {
    if (!registration.id) {
      return;
    }

    // Manual registrations cannot send emails
    if (registration.isManual) {
      this.toastr.warning(this.translationService.instant('eventRegistration.manualRegistrationNoEmail'));
      return;
    }

    // Show info toastr that email is being sent
    const infoToast = this.toastr.info(
      this.translationService.instant('eventRegistration.sendingEmail'),
      this.translationService.instant('eventRegistration.resendingEmail'),
      { timeOut: 0, extendedTimeOut: 0, closeButton: true, disableTimeOut: true }
    );

    this.eventRegistrationService.resendEmail(registration.id).subscribe({
      next: (response) => {
        // Close the info toastr
        if (infoToast && infoToast.toastId) {
          this.toastr.remove(infoToast.toastId);
        }
        
        // Show success message
        this.toastr.success(
          response.message || this.translationService.instant('eventRegistration.resendEmailSuccess')
        );
        
        // Update the local registration object with the updated email status
        if (response.result) {
          const index = this.registrations.findIndex(r => r.id === registration.id);
          if (index !== -1) {
            this.registrations[index].emailSent = response.result.emailSent;
            this.registrations[index].emailSentAt = response.result.emailSentAt;
            // Re-group registrations
            this.groupRegistrationsByOrganization();
            this.cdr.detectChanges();
          }
        }
      },
      error: (error) => {
        // Close the info toastr
        if (infoToast && infoToast.toastId) {
          this.toastr.remove(infoToast.toastId);
        }
        
        // Show error message
        this.toastr.error(
          error.error?.message || this.translationService.instant('eventRegistration.resendEmailError')
        );
      },
    });
  }

  sendFinalApproval(registration: EventRegistration): void {
    if (!registration.id) {
      return;
    }

    // Manual registrations cannot send emails
    if (registration.isManual) {
      this.toastr.warning(this.translationService.instant('eventRegistration.manualRegistrationNoEmail'));
      return;
    }

    // Show info toastr that email is being sent
    const infoToast = this.toastr.info(
      this.translationService.instant('eventRegistration.sendingFinalApproval'),
      this.translationService.instant('eventRegistration.sendingEmail'),
      { timeOut: 0, extendedTimeOut: 0, closeButton: true, disableTimeOut: true }
    );

    this.loadingService.show();
    this.eventRegistrationService.sendFinalApproval(registration.id).subscribe({
      next: (response) => {
        // Close the info toastr
        if (infoToast && infoToast.toastId) {
          this.toastr.remove(infoToast.toastId);
        }
        
        // Show success message
        this.toastr.success(
          response.message || this.translationService.instant('eventRegistration.sendFinalApprovalSuccess')
        );
        
        // Update the local registration object with the updated email status
        if (response.result) {
          const index = this.registrations.findIndex(r => r.id === registration.id);
          if (index !== -1) {
            this.registrations[index].emailSent = response.result.emailSent;
            this.registrations[index].emailSentAt = response.result.emailSentAt;
            // Re-group registrations
            this.groupRegistrationsByOrganization();
            this.cdr.detectChanges();
          }
        }
        
        this.loadingService.hide();
      },
      error: (error) => {
        // Close the info toastr
        if (infoToast && infoToast.toastId) {
          this.toastr.remove(infoToast.toastId);
        }
        
        this.loadingService.hide();
        this.toastr.error(
          error.error?.message || this.translationService.instant('eventRegistration.sendFinalApprovalError')
        );
      },
    });
  }

  editRegistration(registration: EventRegistration): void {
    if (!registration.id) {
      return;
    }

    // Fetch fresh registration data from API to ensure we have the latest data
    this.eventRegistrationService.getById(registration.id).subscribe({
      next: (response) => {
        if (response.result) {
          const freshRegistration = response.result;
          
          const dialogRef = this.dialogService.open(EventRegistrationEditFormComponent, {
            data: { registration: freshRegistration },
            width: '600px',
            enableClose: true,
            closeButton: true,
            resizable: false,
            draggable: true,
            size: 'md',
          });

          dialogRef.afterClosed$.subscribe((result) => {
            if (result && typeof result === 'object') {
              // API returned updated registration - update the local registration object directly
              const updatedRegistration = result as EventRegistration;
              const updateIndex = this.registrations.findIndex(r => r.id === updatedRegistration.id);
              if (updateIndex !== -1) {
                // Update the registration object with the API response
                this.registrations[updateIndex] = { ...this.registrations[updateIndex], ...updatedRegistration };
                // Re-group registrations to reflect changes
                this.groupRegistrationsByOrganization();
                this.cdr.detectChanges();
              }
            } else if (result === true) {
              // Fallback - refresh all registrations if no data returned
              this.fetchRegistrations();
            }
          });
        }
      },
      error: () => {
        // If API call fails, use the local registration data
        const dialogRef = this.dialogService.open(EventRegistrationEditFormComponent, {
          data: { registration },
          width: '600px',
          enableClose: true,
          closeButton: true,
          resizable: false,
          draggable: true,
          size: 'md',
        });

        dialogRef.afterClosed$.subscribe((result) => {
          if (result && typeof result === 'object') {
            const updatedRegistration = result as EventRegistration;
            const updateIndex = this.registrations.findIndex(r => r.id === updatedRegistration.id);
            if (updateIndex !== -1) {
              this.registrations[updateIndex] = { ...this.registrations[updateIndex], ...updatedRegistration };
              this.groupRegistrationsByOrganization();
              this.cdr.detectChanges();
            }
          } else if (result === true) {
            this.fetchRegistrations();
          }
        });
      }
    });
  }

  addManualRegistration(): void {
    const dialogRef = this.dialogService.open(EventRegistrationManualFormComponent, {
      data: { eventId: this.eventId },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload registrations after successful manual registration
        this.fetchRegistrations();
      }
    });
  }

  updateVipStatus(registration: EventRegistration, event: Event): void {
    if (!registration.id) {
      return;
    }

    const target = event.target as HTMLSelectElement;
    const newVipStatus = Number(target.value) as VipStatus;
    
    this.loadingService.show();
    
    this.eventRegistrationService.update(registration.id, { vipStatus: newVipStatus }).subscribe({
      next: (response) => {
        this.loadingService.hide();
        if (response.result) {
          // Update the local registration object
          const updateIndex = this.registrations.findIndex(r => r.id === registration.id);
          if (updateIndex !== -1) {
            this.registrations[updateIndex] = { ...this.registrations[updateIndex], vipStatus: newVipStatus };
            this.groupRegistrationsByOrganization();
            this.cdr.detectChanges();
          }
          
          this.toastr.success(
            this.translationService.instant('eventRegistration.vipStatusUpdated')
          );
        }
      },
      error: (error) => {
        this.loadingService.hide();
        this.toastr.error(
          error.error?.message || this.translationService.instant('eventRegistration.vipToggleError')
        );
        // Revert dropdown state on error
        this.cdr.detectChanges();
      }
    });
  }

  toggleVipStatusMenu(registrationId: number, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    
    // Close other dropdowns when opening VIP menu
    if (this.openVipMenuId !== registrationId) {
      this.closeMenu();
      this.closeEmailStatus();
    }
    
    if (this.openVipMenuId === registrationId) {
      this.closeVipMenu();
    } else {
      this.openVipMenuId = registrationId;
      // Calculate position for fixed dropdown
      if (event) {
        const button = event.currentTarget as HTMLElement;
        const rect = button.getBoundingClientRect();
        this.vipMenuPosition = {
          top: rect.bottom - 40,
          right: window.innerWidth - rect.right
        };
      }
    }
  }

  closeVipMenu(): void {
    this.openVipMenuId = null;
  }

  updateVipStatusTo(registration: EventRegistration, newVipStatus: VipStatus): void {
    if (!registration.id) {
      return;
    }

    // Close menu first
    this.closeVipMenu();

    // If status is already the same, don't update
    if (this.normalizeVipStatus(registration.vipStatus) === newVipStatus) {
      return;
    }
    
    this.loadingService.show();
    
    this.eventRegistrationService.update(registration.id, { vipStatus: newVipStatus }).subscribe({
      next: (response) => {
        this.loadingService.hide();
        if (response.result) {
          // Update the local registration object
          const updateIndex = this.registrations.findIndex(r => r.id === registration.id);
          if (updateIndex !== -1) {
            this.registrations[updateIndex] = { ...this.registrations[updateIndex], vipStatus: newVipStatus };
            this.groupRegistrationsByOrganization();
            this.cdr.detectChanges();
          }
          
          this.toastr.success(
            this.translationService.instant('eventRegistration.vipStatusUpdated')
          );
        }
      },
      error: (error) => {
        this.loadingService.hide();
        this.toastr.error(
          error.error?.message || this.translationService.instant('eventRegistration.vipToggleError')
        );
        this.cdr.detectChanges();
      }
    });
  }

  getVipStatusButtonClass(vipStatus?: VipStatus | string | number): string {
    const normalized = this.normalizeVipStatus(vipStatus);
    switch (normalized) {
      case VipStatus.Attendee:
        return 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 focus:ring-gray-500';
      case VipStatus.Vip:
        return 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 focus:ring-purple-500';
      case VipStatus.VVip:
        return 'bg-indigo-100 text-indigo-700 border border-indigo-300 hover:bg-indigo-200 focus:ring-indigo-500';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 focus:ring-gray-500';
    }
  }

  editSeatNumber(registration: EventRegistration): void {
    if (!registration.id) {
      return;
    }

    // Fetch fresh registration data from API to ensure we have the latest seat number
    this.eventRegistrationService.getById(registration.id).subscribe({
      next: (response) => {
        if (response.result) {
          const freshRegistration = response.result;
          // Update local registration with fresh data
          const index = this.registrations.findIndex(r => r.id === freshRegistration.id);
          if (index !== -1) {
            this.registrations[index] = { ...this.registrations[index], ...freshRegistration };
          }
          
          // Get the seat number from the fresh API response
          const seatNumberValue = freshRegistration.seatNumber;
          const currentSeatNumber = (seatNumberValue && typeof seatNumberValue === 'string' && seatNumberValue.trim() !== '') 
            ? seatNumberValue.trim() 
            : '';
          
          const dialogRef = this.dialogService.open(SeatNumberDialogComponent, {
            data: { 
              currentSeatNumber: currentSeatNumber,
              registrationId: freshRegistration.id
            },
            width: '500px',
            enableClose: true,
            closeButton: true,
            resizable: false,
            draggable: true,
            size: 'md',
          });

          dialogRef.afterClosed$.subscribe((result) => {
            if (result && typeof result === 'object') {
              // API returned updated registration - update the local registration object directly
              const updatedRegistration = result as EventRegistration;
              const updateIndex = this.registrations.findIndex(r => r.id === updatedRegistration.id);
              if (updateIndex !== -1) {
                // Update the registration object with the API response
                this.registrations[updateIndex] = { ...this.registrations[updateIndex], ...updatedRegistration };
                // Re-group registrations to reflect changes
                this.groupRegistrationsByOrganization();
                this.cdr.detectChanges();
              }
            } else if (result === true) {
              // Fallback - refresh all registrations if no data returned
              this.fetchRegistrations();
            }
          });
        }
      },
      error: () => {
        // If API call fails, use the local registration data
        const seatNumberValue = registration.seatNumber;
        const currentSeatNumber = (seatNumberValue && typeof seatNumberValue === 'string' && seatNumberValue.trim() !== '') 
          ? seatNumberValue.trim() 
          : '';
        
        const dialogRef = this.dialogService.open(SeatNumberDialogComponent, {
          data: { 
            currentSeatNumber: currentSeatNumber,
            registrationId: registration.id
          },
          width: '500px',
          enableClose: true,
          closeButton: true,
          resizable: false,
          draggable: true,
          size: 'md',
        });

        dialogRef.afterClosed$.subscribe((result) => {
          if (result && typeof result === 'object') {
            const updatedRegistration = result as EventRegistration;
            const updateIndex = this.registrations.findIndex(r => r.id === updatedRegistration.id);
            if (updateIndex !== -1) {
              this.registrations[updateIndex] = { ...this.registrations[updateIndex], ...updatedRegistration };
              this.groupRegistrationsByOrganization();
              this.cdr.detectChanges();
            }
          } else if (result === true) {
            this.fetchRegistrations();
          }
        });
      }
    });
  }

  groupRegistrationsByOrganization(): void {
    this.groupedRegistrations = {};
    this.organizationNames = [];

    // Filter registrations by organization if filter is set
    let filteredRegistrations = this.registrations;
    if (this.organizationFilter) {
      filteredRegistrations = this.registrations.filter(reg => {
        const orgName = reg.eventOrganization?.name || 'No Organization';
        return orgName === this.organizationFilter;
      });
    }

    // Group registrations by organization
    filteredRegistrations.forEach(registration => {
      const orgName = registration.eventOrganization?.name || 'No Organization';
      if (!this.groupedRegistrations[orgName]) {
        this.groupedRegistrations[orgName] = [];
        this.organizationNames.push(orgName);
      }
      this.groupedRegistrations[orgName].push(registration);
    });

    // Sort organization names alphabetically
    this.organizationNames.sort();
  }

  getRegistrationsForOrganization(orgName: string): EventRegistration[] {
    return this.groupedRegistrations[orgName] || [];
  }

  getOrganizationCount(orgName: string): number {
    return this.groupedRegistrations[orgName]?.length || 0;
  }

  updateCounts(): void {
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.draftCount = this.registrations.filter(r => 
        this.normalizeStatus(r.status) === EventRegistrationStatus.Draft &&
        (!r.eventOrganization || !r.eventOrganization.isMain)
      ).length;
      
      this.approvedCount = this.registrations.filter(r => 
        this.normalizeStatus(r.status) === EventRegistrationStatus.Approved &&
        (!r.eventOrganization || !r.eventOrganization.isMain)
      ).length;
      
      this.cdr.markForCheck();
    }, 0);
  }

  getDraftCount(): number {
    return this.draftCount;
  }

  getApprovedCount(): number {
    return this.approvedCount;
  }

  exportToExcel(excludeMainOrganization: boolean = false): void {
    this.loadingService.show();
    
    // Find eventOrganizationId from organizationFilter (organization name)
    let eventOrganizationId: number | undefined = undefined;
    if (this.organizationFilter) {
      const org = this.registrations.find(r => {
        const orgName = r.eventOrganization?.name || 'No Organization';
        return orgName === this.organizationFilter;
      });
      if (org?.eventOrganizationId) {
        eventOrganizationId = org.eventOrganizationId;
      }
    }
    
    // Call backend export endpoint
    this.eventRegistrationService.exportToExcel(
      this.eventId,
      this.searchTerm || undefined,
      this.statusFilter !== null ? this.statusFilter : undefined,
      this.vipStatusFilter !== null ? this.vipStatusFilter : undefined,
      this.isManualFilter !== null ? this.isManualFilter : undefined,
      excludeMainOrganization,
      eventOrganizationId
    )
      .pipe(
        finalize(() => this.loadingService.hide())
      )
      .subscribe({
        next: (blob) => {
          // Create download link
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          
          // Get filename from Content-Disposition header if available, otherwise generate one
          const eventName = this.dialogRef.data?.eventName || 'Event';
          const dateStr = new Date().toISOString().split('T')[0];
          const exportType = excludeMainOrganization ? 'WithoutMainOrg' : 'All';
          const filename = `Event_Registrations_${exportType}_${eventName.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.csv`;
          
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          this.toastr.success(this.translationService.instant('eventRegistration.exportSuccess'));
        },
        error: (error) => {
          this.toastr.error(error.error?.message || this.translationService.instant('common.error'));
        }
      });
  }

  exportToExcelWithoutMainOrg(): void {
    this.exportToExcel(true);
  }

  exportOrganizationToExcel(orgName: string): void {
    // Get registrations for this organization
    const orgRegistrations = this.getRegistrationsForOrganization(orgName);
    
    if (orgRegistrations.length === 0) {
      this.toastr.warning(this.translationService.instant('eventRegistration.noDataToExport'));
      return;
    }

    // Prepare data for export
    const exportData: any[] = [];
    
    // Add headers with translations
    const headers = [
      this.translationService.instant('eventRegistration.organization'),
      this.translationService.instant('eventRegistration.name'),
      this.translationService.instant('eventRegistration.nameAr'),
      this.translationService.instant('eventRegistration.phone'),
      this.translationService.instant('eventRegistration.email'),
      this.translationService.instant('eventRegistration.barcode'),
      this.translationService.instant('eventRegistration.status'),
      this.translationService.instant('eventRegistration.vipStatus'),
      this.translationService.instant('eventRegistration.isManual'),
      this.translationService.instant('eventRegistration.emailSent'),
      this.translationService.instant('eventRegistration.emailSentAt'),
      this.translationService.instant('eventRegistration.checkIn'),
      this.translationService.instant('eventRegistration.checkOut'),
    ];
    exportData.push(headers);

    // Add data rows
    orgRegistrations.forEach(registration => {
      const latestCheckIn = this.getLatestCheckIn(registration);
      const row = [
        registration.eventOrganization?.name || 'No Organization',
        registration.name || '',
        registration.nameAr || '',
        registration.phone || '',
        registration.email || '',
        registration.barcode || '',
        this.getStatusText(registration.status ?? EventRegistrationStatus.Draft),
        this.getVipStatusLabel(registration.vipStatus),
        registration.isManual ? this.translationService.instant('common.yes') : this.translationService.instant('common.no'),
        registration.emailSent 
          ? this.translationService.instant('eventRegistration.emailSent') 
          : this.translationService.instant('eventRegistration.emailNotSent'),
        registration.emailSentAt ? this.formatDateTime(registration.emailSentAt) : '',
        latestCheckIn?.checkInDateTime ? this.formatDateTime(latestCheckIn.checkInDateTime) : '',
        latestCheckIn?.checkOutDateTime ? this.formatDateTime(latestCheckIn.checkOutDateTime) : ''
      ];
      exportData.push(row);
    });

    // Convert to CSV
    const csvContent = exportData.map(row => 
      row.map((cell: any) => {
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    // Add BOM for UTF-8 to support Arabic characters
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with event name, organization name, and date
    const eventName = this.dialogRef.data?.eventName || 'Event';
    const dateStr = new Date().toISOString().split('T')[0];
    const safeOrgName = orgName.replace(/[^a-z0-9]/gi, '_');
    const filename = `Event_Registrations_${safeOrgName}_${eventName.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    this.toastr.success(this.translationService.instant('eventRegistration.exportSuccess'));
  }

  toggleMenu(registrationId: number, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      // Calculate position relative to viewport for fixed positioning
      this.menuPosition = {
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      };
    }
    
    // Close other dropdowns when opening actions menu
    if (this.openMenuId !== registrationId) {
      this.closeVipMenu();
      this.closeEmailStatus();
    }
    
    this.openMenuId = this.openMenuId === registrationId ? null : registrationId;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  toggleEmailStatus(registrationId: number, event: MouseEvent): void {
    event.stopPropagation();
    
    // Close other dropdowns when opening email status
    if (this.openEmailStatusId !== registrationId) {
      this.closeVipMenu();
      this.closeMenu();
    }
    
    if (this.openEmailStatusId === registrationId) {
      this.closeEmailStatus();
    } else {
      this.openEmailStatusId = registrationId;
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      // Calculate position - show tooltip below the button
      this.emailStatusPosition = {
        top: rect.bottom + 5,
        right: window.innerWidth - rect.right
      };
    }
  }

  closeEmailStatus(): void {
    this.openEmailStatusId = null;
  }

  onTableRowClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Don't close dropdowns if clicking on buttons, inputs, or dropdowns themselves
    if (target.closest('button') || 
        target.closest('input') || 
        target.closest('select') || 
        target.closest('.vip-status-dropdown') || 
        target.closest('.email-status-tooltip') || 
        target.closest('.fixed.w-48')) {
      return;
    }
    // Close all dropdowns when clicking on table row
    this.closeVipMenu();
    this.closeMenu();
    this.closeEmailStatus();
  }

  getTotalEmailsSent(registration: EventRegistration): number {
    let count = 0;
    if (registration.registrationSuccessfulEmailSent) count++;
    if (registration.confirmationEmailSent) count++;
    if (registration.finalApprovalEmailSent) count++;
    return count;
  }

  getCurrentRegistrationForEmailStatus(): EventRegistration | null {
    if (!this.openEmailStatusId) return null;
    return this.registrations.find(r => r.id === this.openEmailStatusId) || null;
  }

  getCurrentRegistration(): EventRegistration | null {
    if (!this.openMenuId) return null;
    return this.registrations.find(r => r.id === this.openMenuId) || null;
  }

  getCurrentVipRegistration(): EventRegistration | null {
    if (!this.openVipMenuId) return null;
    return this.registrations.find(r => r.id === this.openVipMenuId) || null;
  }

  getStatusText(status: EventRegistrationStatus): string {
    switch (status) {
      case EventRegistrationStatus.Draft:
        return this.translationService.instant('eventRegistration.statusDraft');
      case EventRegistrationStatus.Approved:
        return this.translationService.instant('eventRegistration.statusApproved');
      case EventRegistrationStatus.Rejected:
        return this.translationService.instant('eventRegistration.statusRejected');
      default:
        return '';
    }
  }

  // Helper function to normalize status (handles string, number, or enum)
  normalizeStatus(status?: EventRegistrationStatus | string | number): number {
    if (status === null || status === undefined) return EventRegistrationStatus.Draft;
    if (typeof status === 'string') {
      const statusMap: { [key: string]: number } = {
        'Draft': EventRegistrationStatus.Draft,
        'Approved': EventRegistrationStatus.Approved,
        'Rejected': EventRegistrationStatus.Rejected,
        '0': EventRegistrationStatus.Draft,
        '1': EventRegistrationStatus.Approved,
        '2': EventRegistrationStatus.Rejected
      };
      return statusMap[status] ?? Number(status) ?? EventRegistrationStatus.Draft;
    }
    return Number(status) ?? EventRegistrationStatus.Draft;
  }

  normalizeVipStatus(vipStatus?: VipStatus | string | number): VipStatus {
    if (vipStatus === null || vipStatus === undefined) return VipStatus.Attendee;
    if (typeof vipStatus === 'string') {
      const statusMap: { [key: string]: VipStatus } = {
        'Attendee': VipStatus.Attendee,
        'VIP': VipStatus.Vip,
        'Vip': VipStatus.Vip,
        'VVIP': VipStatus.VVip,
        'VVip': VipStatus.VVip,
        '0': VipStatus.Attendee,
        '1': VipStatus.Vip,
        '2': VipStatus.VVip
      };
      return statusMap[vipStatus] ?? Number(vipStatus) ?? VipStatus.Attendee;
    }
    return Number(vipStatus) ?? VipStatus.Attendee;
  }

  getVipStatusLabel(vipStatus?: VipStatus | string | number): string {
    const normalized = this.normalizeVipStatus(vipStatus);
    switch (normalized) {
      case VipStatus.Attendee:
        return this.translationService.instant('eventRegistration.attendee');
      case VipStatus.Vip:
        return this.translationService.instant('eventRegistration.vip');
      case VipStatus.VVip:
        return this.translationService.instant('eventRegistration.vVip');
      default:
        return this.translationService.instant('eventRegistration.attendee');
    }
  }

  getVipStatusClass(vipStatus?: VipStatus | string | number): string {
    const normalized = this.normalizeVipStatus(vipStatus);
    switch (normalized) {
      case VipStatus.Attendee:
        return 'bg-gray-100 text-gray-800';
      case VipStatus.Vip:
        return 'bg-purple-100 text-purple-800';
      case VipStatus.VVip:
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}

