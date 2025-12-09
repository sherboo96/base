import {
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  Location,
  LocationService,
  LocationResponse,
  LocationCategory,
} from '../../../services/location.service';
import { OrganizationService } from '../../../services/organization.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DialogService } from '@ngneat/dialog';
import { LocationFormComponent } from './location-form/location-form.component';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { TranslationService } from '../../../services/translation.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LoadingComponent,
    LocationFormComponent,
  ],
  templateUrl: './location.component.html',
  styleUrl: './location.component.scss',
})
export class LocationComponent implements OnInit, OnDestroy {
  locations: Location[] = [];
  organizations: any[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  filterOrganizationId: number | null = null;
  filterCategory: string = 'all'; // 'all', 'onsite', 'online', 'outsite', 'abroad'
  Math = Math;
  LocationCategory = LocationCategory;
  private subscriptions: Subscription[] = [];

  constructor(
    private locationService: LocationService,
    private organizationService: OrganizationService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private dialogService: DialogService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.fetchOrganizations();
    this.fetchLocations();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchOrganizations(): void {
    const sub = this.organizationService
      .getOrganizations(1, 1000)
      .subscribe({
        next: (response) => {
          this.organizations = response.result;
        },
        error: (error) => {
          console.error('Error fetching organizations:', error);
        },
      });
    this.subscriptions.push(sub);
  }

  fetchLocations(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.locationService
      .getLocations(
        this.currentPage,
        this.pageSize,
        this.searchTerm || undefined,
        this.filterOrganizationId || undefined,
        this.filterCategory !== 'all' ? this.filterCategory : undefined
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          // Normalize category values to ensure they're numbers
          this.locations = response.result.map(location => ({
            ...location,
            category: typeof location.category === 'number' 
              ? location.category 
              : (typeof location.category === 'object' 
                  ? (location.category as any).value || (location.category as any).id || Number(location.category) || 1
                  : Number(location.category) || 1)
          }));
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          this.toastr.error(
            error.error.message || this.translationService.instant('location.fetchError')
          );
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchLocations();
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
    this.fetchLocations();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchLocations();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchLocations();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterOrganizationId = null;
    this.filterCategory = 'all';
    this.currentPage = 1;
    this.fetchLocations();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.searchTerm ||
      this.filterOrganizationId !== null ||
      this.filterCategory !== 'all'
    );
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getCategoryText(category: LocationCategory | number | any): string {
    try {
      // Handle null/undefined
      if (category == null || category === undefined) {
        return '';
      }
      
      // If it's already a number, use it directly
      let categoryValue: number;
      if (typeof category === 'number') {
        categoryValue = category;
      } else if (typeof category === 'string') {
        categoryValue = parseInt(category, 10);
      } else if (typeof category === 'object') {
        // If it's an object, try to extract the value
        categoryValue = Number(category) || (category as any).value || (category as any).id || (category as any).category || 0;
      } else {
        categoryValue = Number(category) || 0;
      }
      
      // Handle NaN
      if (isNaN(categoryValue) || categoryValue === 0) {
        return '';
      }
      
      let translationKey = '';
      switch (categoryValue) {
        case LocationCategory.Onsite:
        case 1:
          translationKey = 'location.categories.onsite';
          break;
        case LocationCategory.Online:
        case 2:
          translationKey = 'location.categories.online';
          break;
        case LocationCategory.OutSite:
        case 3:
          translationKey = 'location.categories.outsite';
          break;
        case LocationCategory.Abroad:
        case 4:
          translationKey = 'location.categories.abroad';
          break;
        default:
          return '';
      }
      
      const translated = this.translationService.instant(translationKey);
      return typeof translated === 'string' ? translated : translationKey;
    } catch (error) {
      console.error('Error getting category text:', error, category);
      return '';
    }
  }

  getCategoryClass(category: LocationCategory | number | any): string {
    // Handle null/undefined
    if (category == null) {
      return 'bg-gray-100 text-gray-800';
    }
    
    // If it's already a number, use it directly
    let categoryValue: number;
    if (typeof category === 'number') {
      categoryValue = category;
    } else if (typeof category === 'string') {
      categoryValue = parseInt(category, 10);
    } else if (typeof category === 'object') {
      // If it's an object, try to extract the value
      categoryValue = Number(category) || (category as any).value || (category as any).id || 0;
    } else {
      categoryValue = Number(category) || 0;
    }
    
    // Handle NaN
    if (isNaN(categoryValue)) {
      return 'bg-gray-100 text-gray-800';
    }
    
    switch (categoryValue) {
      case LocationCategory.Onsite:
      case 1:
        return 'bg-blue-100 text-blue-800';
      case LocationCategory.Online:
      case 2:
        return 'bg-green-100 text-green-800';
      case LocationCategory.OutSite:
      case 3:
        return 'bg-yellow-100 text-yellow-800';
      case LocationCategory.Abroad:
      case 4:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive 
      ? this.translationService.instant('common.active') 
      : this.translationService.instant('common.inactive');
  }

  addNewLocation(): void {
    const dialogRef = this.dialogService.open(LocationFormComponent, {
      data: { organizations: this.organizations },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchLocations();
      }
    });
  }

  editLocation(location: Location): void {
    const dialogRef = this.dialogService.open(LocationFormComponent, {
      data: { location, organizations: this.organizations },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchLocations();
      }
    });
  }

  deleteLocation(location: Location): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: 'danger',
        title: this.translationService.instant('location.deleteTitle'),
        message: this.translationService.instant('location.deleteMessage', { name: location.name }),
        confirmText: this.translationService.instant('common.delete'),
        cancelText: this.translationService.instant('common.cancel'),
      },
      width: '400px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.locationService.deleteLocation(location.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('location.deleteSuccess'));
            this.loadingService.hide();
            this.fetchLocations();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('location.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }

  toggleLocationStatus(location: Location): void {
    const isActivating = !location.isActive;
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        type: isActivating ? 'success' : 'warning',
        title: isActivating
          ? this.translationService.instant('location.activateTitle')
          : this.translationService.instant('location.deactivateTitle'),
        message: isActivating
          ? this.translationService.instant('location.activateMessage', { name: location.name })
          : this.translationService.instant('location.deactivateMessage', { name: location.name }),
        confirmText: this.translationService.instant('common.confirm'),
        cancelText: this.translationService.instant('common.cancel'),
      },
      width: '400px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.locationService.toggleLocationStatus(location.id).subscribe({
          next: () => {
            this.toastr.success(
              isActivating
                ? this.translationService.instant('location.activateSuccess')
                : this.translationService.instant('location.deactivateSuccess')
            );
            this.loadingService.hide();
            this.fetchLocations();
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message ||
                (isActivating
                  ? this.translationService.instant('location.activateError')
                  : this.translationService.instant('location.deactivateError'))
            );
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

  getLogoUrl(logoPath: string): string {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) {
      return logoPath;
    }
    const baseUrl = environment.baseUrl.replace('/api', '');
    return logoPath.startsWith('/') ? `${baseUrl}${logoPath}` : `${baseUrl}/${logoPath}`;
  }

  previewLogo(logoPath: string): void {
    const logoUrl = this.getLogoUrl(logoPath);
    if (!logoUrl) return;
    
    // Open logo in new window/tab
    window.open(logoUrl, '_blank');
  }

  previewTemplate(templatePath: string): void {
    if (!templatePath) return;
    
    const baseUrl = environment.baseUrl.replace('/api', '');
    const templateUrl = templatePath.startsWith('/') 
      ? `${baseUrl}${templatePath}` 
      : `${baseUrl}/${templatePath}`;
    
    // Check if it's a PDF or HTML file
    const isPdf = templatePath.toLowerCase().endsWith('.pdf');
    const isHtml = templatePath.toLowerCase().endsWith('.html') || templatePath.toLowerCase().endsWith('.htm');
    
    if (isPdf || isHtml) {
      // Open PDF/HTML in new window
      window.open(templateUrl, '_blank');
    } else {
      // For other file types, try to download or open
      window.open(templateUrl, '_blank');
    }
  }
}
