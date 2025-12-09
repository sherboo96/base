import {
  Component,
  OnInit,
  OnDestroy,
  ComponentFactoryResolver,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  Organization,
  OrganizationService,
  OrganizationResponse,
} from '../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DialogService, DialogConfig } from '@ngneat/dialog';
import { OrganizationFormComponent } from './organization-form/organization-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LoadingComponent,
    OrganizationFormComponent,
  ],
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.scss',
})
export class OrganizationComponent implements OnInit, OnDestroy {
  organizations: Organization[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  filterIsMain: string = 'all'; // 'all', 'main', 'not-main'
  filterStatus: string = 'all'; // 'all', 'active', 'inactive'
  Math = Math;
  private dialogComponentRef: any;
  private subscriptions: Subscription[] = [];

  constructor(
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private componentFactoryResolver: ComponentFactoryResolver,
    private viewContainerRef: ViewContainerRef,
    private dialogService: DialogService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.fetchOrganizations();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.dialogComponentRef) {
      this.dialogComponentRef.destroy();
    }
  }

  fetchOrganizations(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.organizationService
      .getOrganizations(
        this.currentPage,
        this.pageSize,
        this.searchTerm || undefined,
        this.filterIsMain !== 'all' ? this.filterIsMain : undefined,
        this.filterStatus !== 'all' ? this.filterStatus : undefined
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.organizations = response.result;
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          this.toastr.error(
            error.error.message || this.translationService.instant('organization.fetchError')
          );
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1; // Reset to first page when changing page size
    this.fetchOrganizations();
  }

  getPageNumbers(): number[] {
    const maxVisiblePages = 5;
    const pages: number[] = [];
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
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
    this.fetchOrganizations();
  }

  onSearch(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.fetchOrganizations();
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page when applying filters
    this.fetchOrganizations();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterIsMain = 'all';
    this.filterStatus = 'all';
    this.currentPage = 1;
    this.fetchOrganizations();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterIsMain !== 'all' || this.filterStatus !== 'all');
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  viewOrganizationDetails(organization: Organization): void {
    this.router.navigate(['/organization', organization.id]);
  }

  addNewOrganization(): void {
    const dialogRef = this.dialogService.open(OrganizationFormComponent, {
      data: {},
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchOrganizations();
      }
    });
  }

  editOrganization(organization: Organization): void {
    const dialogRef = this.dialogService.open(OrganizationFormComponent, {
      data: { organization },
      width: '800px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchOrganizations();
      }
    });
  }

  deleteOrganization(organization: Organization): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('organization.deleteTitle'),
        message: this.translationService.instant('organization.deleteMessage', { name: organization.name }),
        confirmText: this.translationService.instant('organization.delete'),
        cancelText: this.translationService.instant('common.cancel'),
        type: 'danger',
        warningMessage: this.translationService.instant('organization.deleteWarning'),
        showWarning: true,
      },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.organizationService.deleteOrganization(organization.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('organization.deleteSuccess'));
            this.loadingService.hide();
            this.fetchOrganizations(); // Refresh the table
          },
          error: (error) => {
            this.toastr.error(error.error?.message || this.translationService.instant('organization.deleteError'));
            this.loadingService.hide();
          },
        });
      }
    });
  }

  toggleStatus(organization: Organization): void {
    const newStatus = !organization.isActive;
    const type = newStatus ? 'success' : 'warning';
    
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant(newStatus ? 'organization.activateTitle' : 'organization.deactivateTitle'),
        message: this.translationService.instant(
          newStatus ? 'organization.activateMessage' : 'organization.deactivateMessage',
          { name: organization.name }
        ),
        confirmText: this.translationService.instant(newStatus ? 'organization.active' : 'organization.inactive'),
        cancelText: this.translationService.instant('common.cancel'),
        type: type,
        warningMessage: this.translationService.instant(
          newStatus ? 'organization.activateWarning' : 'organization.deactivateWarning'
        ),
        showWarning: true,
      },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.organizationService.toggleOrganizationStatus(organization.id).subscribe({
          next: () => {
            this.toastr.success(
              this.translationService.instant(newStatus ? 'organization.activateSuccess' : 'organization.deactivateSuccess')
            );
            this.loadingService.hide();
            this.fetchOrganizations();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant(newStatus ? 'organization.activateError' : 'organization.deactivateError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  setAsMain(organization: Organization): void {
    if (organization.isMain) {
      this.toastr.info(this.translationService.instant('organization.alreadyMain'));
      return;
    }

    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('organization.setMainTitle'),
        message: this.translationService.instant('organization.setMainMessage', { name: organization.name }),
        confirmText: this.translationService.instant('organization.setMain'),
        cancelText: this.translationService.instant('common.cancel'),
        type: 'main',
        warningMessage: this.translationService.instant('organization.setMainWarning'),
        showWarning: true,
      },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.organizationService.setAsMainOrganization(organization.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('organization.setMainSuccess'));
            this.loadingService.hide();
            this.fetchOrganizations();
          },
          error: (error) => {
            this.toastr.error(error.error?.message || this.translationService.instant('organization.setMainError'));
            this.loadingService.hide();
          },
        });
      }
    });
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }
}
