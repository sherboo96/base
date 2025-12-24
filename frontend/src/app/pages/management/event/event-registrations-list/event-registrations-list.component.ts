import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef, DialogService } from '@ngneat/dialog';
import { EventRegistrationService, EventRegistration, EventRegistrationListResponse, EventRegistrationStatus, EventAttendee } from '../../../../services/event-registration.service';
import { LoadingService } from '../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';
import { finalize } from 'rxjs/operators';
import { EventBadgeComponent } from '../../../../components/event-badge/event-badge.component';
import { SeatNumberDialogComponent } from './seat-number-dialog/seat-number-dialog.component';

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
          <div class="flex items-center gap-2">
            <button
              (click)="exportToExcel()"
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-accent bg-accent text-white rounded-lg hover:bg-accentDark hover:border-accentDark transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium font-poppins text-sm whitespace-nowrap"
              [title]="'eventRegistration.exportAll' | translate"
            >
              <i class="fas fa-file-excel text-base"></i>
              <span>{{ 'eventRegistration.exportAll' | translate }}</span>
            </button>
            <button
              (click)="exportToExcel(EventRegistrationStatus.Approved)"
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-green-500 bg-green-500 text-white rounded-lg hover:bg-green-600 hover:border-green-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium font-poppins text-sm whitespace-nowrap"
              [title]="'eventRegistration.exportApproved' | translate"
            >
              <i class="fas fa-check-circle text-base"></i>
              <span>{{ 'eventRegistration.exportApproved' | translate }}</span>
            </button>
            <button
              (click)="exportToExcel(EventRegistrationStatus.Rejected)"
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-red-500 bg-red-500 text-white rounded-lg hover:bg-red-600 hover:border-red-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium font-poppins text-sm whitespace-nowrap"
              [title]="'eventRegistration.exportRejected' | translate"
            >
              <i class="fas fa-times-circle text-base"></i>
              <span>{{ 'eventRegistration.exportRejected' | translate }}</span>
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
                class="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-accent bg-accent text-white rounded-lg hover:bg-accentDark hover:border-accentDark transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium font-poppins text-xs whitespace-nowrap"
                [title]="'eventRegistration.exportOrganization' | translate"
              >
                <i class="fas fa-file-excel text-sm"></i>
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
                <tr *ngFor="let registration of getRegistrationsForOrganization(orgName)" class="hover:bg-gray-50 transition-all duration-150">
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
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-xs" style="position: relative;">
                  <button
                    (click)="toggleEmailStatus(registration.id!, $event)"
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-200"
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
                    <!-- Approve Button -->
                    <button
                      *ngIf="normalizeStatus(registration.status) === 0"
                      (click)="approveRegistration(registration)"
                      class="inline-flex items-center px-3 py-1.5 border-2 border-green-500 rounded-lg text-green-600 bg-white hover:bg-green-500 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium"
                      [title]="'eventRegistration.approve' | translate"
                    >
                      <i class="fas fa-check mr-1 text-xs"></i>
                      <span>{{ 'eventRegistration.approve' | translate }}</span>
                    </button>
                    <!-- Reject Button -->
                    <button
                      *ngIf="normalizeStatus(registration.status) === 0"
                      (click)="rejectRegistration(registration)"
                      class="inline-flex items-center px-3 py-1.5 border-2 border-red-500 rounded-lg text-red-600 bg-white hover:bg-red-500 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium"
                      [title]="'eventRegistration.reject' | translate"
                    >
                      <i class="fas fa-times mr-1 text-xs"></i>
                      <span>{{ 'eventRegistration.reject' | translate }}</span>
                    </button>
                    <!-- Send Final Approval Button -->
                    <button
                      *ngIf="normalizeStatus(registration.status) === 1"
                      (click)="sendFinalApproval(registration)"
                      class="inline-flex items-center px-3 py-1.5 border-2 border-blue-500 rounded-lg text-blue-600 bg-white hover:bg-blue-500 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium"
                      [title]="'eventRegistration.sendFinalApproval' | translate"
                    >
                      <i class="fas fa-paper-plane mr-1 text-xs"></i>
                      <span>{{ 'eventRegistration.sendFinalApproval' | translate }}</span>
                    </button>
                    <!-- 3 Dots Menu -->
                    <div class="relative">
                      <button
                        (click)="toggleMenu(registration.id!, $event)"
                        class="inline-flex items-center justify-center px-2 py-1.5 border-2 border-gray-300 rounded-lg text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50 shadow-sm hover:shadow-md font-medium"
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
      <div *ngIf="loadingService.isLoading$ | async" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
            <option [value]="10">10 {{ 'common.perPage' | translate }}</option>
            <option [value]="20">20 {{ 'common.perPage' | translate }}</option>
            <option [value]="50">50 {{ 'common.perPage' | translate }}</option>
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
    
    <!-- Dropdown Menu (rendered outside table) -->
    <div
      *ngIf="openMenuId && getCurrentRegistration()"
      class="fixed w-48 bg-white rounded-lg shadow-xl border-2 border-gray-200 py-1"
      [style.top.px]="menuPosition.top"
      [style.right.px]="menuPosition.right"
      style="z-index: 99999;"
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
          *ngIf="registration.barcode"
          (click)="printBadge(registration); closeMenu()"
          class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <i class="fas fa-print text-purple-500"></i>
          <span>{{ 'eventRegistration.printBadge' | translate }}</span>
        </button>
        <button
          *ngIf="normalizeStatus(registration.status) === 1"
          (click)="resendEmail(registration); closeMenu()"
          class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <i class="fas fa-paper-plane text-purple-500"></i>
          <span>{{ 'eventRegistration.resendEmail' | translate }}</span>
        </button>
        <button
          *ngIf="normalizeStatus(registration.status) === 1"
          (click)="sendFinalApproval(registration); closeMenu()"
          class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <i class="fas fa-check-circle text-green-500"></i>
          <span>{{ 'eventRegistration.sendFinalApproval' | translate }}</span>
        </button>
        <hr class="my-1 border-gray-200">
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
      style="z-index: 99999; min-width: 280px;"
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
  pageSize = 20;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  eventId: number;
  eventName: string;
  openMenuId: number | null = null;
  menuPosition: { top: number; right: number } = { top: 0, right: 0 };
  openEmailStatusId: number | null = null;
  emailStatusPosition: { top: number; right: number } = { top: 0, right: 0 };
  
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
    this.fetchRegistrations();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Close menu if clicking outside the button or dropdown menu
    if (!target.closest('button[title*="More"]') && !target.closest('.fixed.w-48')) {
      this.closeMenu();
    }
    // Close email status tooltip if clicking outside
    if (!target.closest('button[title*="Email Status"]') && !target.closest('.email-status-tooltip')) {
      this.closeEmailStatus();
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
        this.eventId
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response: EventRegistrationListResponse) => {
          this.registrations = response.result;
          this.totalItems = response.pagination?.total || 0;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
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
        
        // Update the local registration object with the updated status
        if (response.result) {
          const index = this.registrations.findIndex(r => r.id === registration.id);
          if (index !== -1) {
            // Update all properties from response, ensuring status is set correctly
            this.registrations[index] = { ...this.registrations[index], ...response.result };
            // Explicitly set status to ensure it's the correct enum value (number)
            this.registrations[index].status = response.result.status ?? EventRegistrationStatus.Approved;
            // Ensure status is a number, not a string
            if (typeof this.registrations[index].status === 'string') {
              this.registrations[index].status = parseInt(this.registrations[index].status as any, 10) as EventRegistrationStatus;
            }
            // Update email status
            this.registrations[index].emailSent = response.result.emailSent;
            this.registrations[index].emailSentAt = response.result.emailSentAt;
            // Re-group registrations
            this.groupRegistrationsByOrganization();
            // Trigger change detection
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
        // Update the local registration object with the updated status
        if (response.result) {
          const index = this.registrations.findIndex(r => r.id === registration.id);
          if (index !== -1) {
            // Update all properties from response, ensuring status is set correctly
            this.registrations[index] = { ...this.registrations[index], ...response.result };
            // Explicitly set status to ensure it's the correct enum value (number)
            this.registrations[index].status = response.result.status ?? EventRegistrationStatus.Rejected;
            // Ensure status is a number, not a string
            if (typeof this.registrations[index].status === 'string') {
              this.registrations[index].status = parseInt(this.registrations[index].status as any, 10) as EventRegistrationStatus;
            }
            // Trigger change detection
            this.cdr.detectChanges();
            // Re-group registrations
            this.groupRegistrationsByOrganization();
          }
        }
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

    // Group registrations by organization
    this.registrations.forEach(registration => {
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

  exportToExcel(statusFilter?: EventRegistrationStatus): void {
    this.loadingService.show();
    
    // Call backend export endpoint
    this.eventRegistrationService.exportToExcel(
      this.eventId,
      this.searchTerm || undefined,
      statusFilter
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
          const exportType = statusFilter === undefined 
            ? 'All' 
            : statusFilter === EventRegistrationStatus.Approved 
              ? 'Approved' 
              : 'Rejected';
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
    this.openMenuId = this.openMenuId === registrationId ? null : registrationId;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  toggleEmailStatus(registrationId: number, event: MouseEvent): void {
    event.stopPropagation();
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
}

