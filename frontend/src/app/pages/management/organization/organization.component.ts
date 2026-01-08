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
  BulkOrganizationUpload,
  BulkOrganizationUploadResponse,
} from '../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DialogService, DialogConfig } from '@ngneat/dialog';
import { OrganizationBulkUploadComponent } from './organization-bulk-upload/organization-bulk-upload.component';
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

  getLoginMethodLabel(loginMethod?: number): string {
    if (!loginMethod) return '-';
    switch (loginMethod) {
      case 1:
        return 'OTP Verification';
      case 2:
        return 'Active Directory';
      case 3:
        return 'Credentials';
      default:
        return '-';
    }
  }

  getLoginMethodBadgeClass(loginMethod?: number): string {
    if (!loginMethod) return 'bg-gray-100 text-gray-800';
    switch (loginMethod) {
      case 1: // OTP Verification
        return 'bg-blue-100 text-blue-800';
      case 2: // Active Directory
        return 'bg-purple-100 text-purple-800';
      case 3: // Credentials
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  exportOrganization(organization: Organization): void {
    this.loadingService.show();
    
    this.organizationService.exportOrganization(organization.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Extract filename from Content-Disposition header if available, otherwise use default
        const orgName = organization.name.replace(/\s+/g, '_');
        const dateStr = new Date().toISOString().split('T')[0];
        link.download = `Organization_Export_${orgName}_${dateStr}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.toastr.success(
          this.translationService.instant('organization.exportSuccess', { name: organization.name })
        );
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error exporting organization:', error);
        this.toastr.error(
          error.error?.message || this.translationService.instant('organization.exportError')
        );
        this.loadingService.hide();
      }
    });
  }

  openBulkUploadDialog(): void {
    const dialogRef = this.dialogService.open(OrganizationBulkUploadComponent, {
      data: {},
      width: '90vw',
      maxWidth: '900px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload organizations after successful upload
        this.fetchOrganizations();
      }
    });
  }

  handleBulkUpload(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const jsonContent = JSON.parse(e.target.result);
        
        // Handle both single object and array
        let organizations: BulkOrganizationUpload[] = [];
        if (Array.isArray(jsonContent)) {
          organizations = jsonContent;
        } else {
          // Single object, wrap in array
          organizations = [jsonContent];
        }

        // Validate and transform the data to match backend DTO format (camelCase)
        const transformedOrgs: BulkOrganizationUpload[] = organizations.map((org: any) => ({
          nameEn: org.name_en || org.nameEn || org.name || '',
          nameAr: org.name_ar || org.nameAr || '',
          code: org.code || '',
          domain: org.domain || ''
        }));

        // Validate required fields
        const invalidOrgs = transformedOrgs.filter(org => 
          !org.nameEn || !org.code || !org.domain
        );

        if (invalidOrgs.length > 0) {
          this.toastr.error(
            this.translationService.instant('organization.bulkUploadInvalidData')
          );
          return;
        }

        // Proceed with upload
        this.uploadOrganizations(transformedOrgs);
      } catch (error: any) {
        console.error('Error parsing JSON:', error);
        this.toastr.error(
          this.translationService.instant('organization.bulkUploadParseError')
        );
      }
    };
    reader.readAsText(file);
  }

  uploadOrganizations(organizations: BulkOrganizationUpload[]): void {
    this.loadingService.show();
    this.organizationService.bulkUploadOrganizations(organizations).subscribe({
      next: (response: any) => {
        const result: BulkOrganizationUploadResponse = response.result || response;
        this.loadingService.hide();
        
        let message = this.translationService.instant('organization.bulkUploadSuccess', {
          added: result.successfullyAdded,
          skipped: result.skipped,
          total: result.totalProcessed
        });

        if (result.skippedDomains && result.skippedDomains.length > 0) {
          message += `\n${this.translationService.instant('organization.skippedDomains')}: ${result.skippedDomains.join(', ')}`;
        }

        if (result.errors && result.errors.length > 0) {
          message += `\n${this.translationService.instant('organization.errors')}: ${result.errors.length}`;
          console.error('Bulk upload errors:', result.errors);
        }

        this.toastr.success(message, '', { timeOut: 5000 });
        this.fetchOrganizations(); // Refresh the list
      },
      error: (error: any) => {
        this.loadingService.hide();
        this.toastr.error(
          error.error?.message || this.translationService.instant('organization.bulkUploadError')
        );
      }
    });
  }
}
