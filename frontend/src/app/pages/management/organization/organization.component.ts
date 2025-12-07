import {
  Component,
  OnInit,
  OnDestroy,
  ComponentFactoryResolver,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    private dialogService: DialogService
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
      .getOrganizations(this.currentPage, this.pageSize)
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
            error.error.message || 'Failed to fetch organizations'
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
      resizable: true,
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
      resizable: true,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchOrganizations();
      }
    });
  }
}
