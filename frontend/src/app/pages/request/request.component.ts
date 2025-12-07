import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestService, Request } from '../../services/request.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../services/loading.service';
import { LoadingComponent } from '../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-request',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './request.component.html',
  styleUrl: './request.component.scss',
})
export class RequestComponent implements OnInit, OnDestroy {
  requests: Request[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private requestService: RequestService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchRequests();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchRequests(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.requestService
      .getRequests(this.currentPage, this.pageSize)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.requests = response.result;
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          this.toastr.error(error.error.message || 'Failed to fetch requests');
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1; // Reset to first page when changing page size
    this.fetchRequests();
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
    this.fetchRequests();
  }

  onSearch(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.fetchRequests();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatTransactionId(transID: string): string {
    return `##${transID}`;
  }

  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 1: // Draft
        return 'bg-yellow-100 text-yellow-800';
      case 2: // Accepted
        return 'bg-green-100 text-green-800';
      case 5: // Documents
        return 'bg-blue-100 text-blue-800';
      case 1002: // Other status
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(statusId: number): string {
    switch (statusId) {
      case 1:
        return 'مسودة';
      case 2:
        return 'تحت الدراسة';
      case 1002:
        return 'تم الاعتماد';
      default:
        return 'غير معروف';
    }
  }

  viewRequestDetails(request: Request): void {
    this.router.navigate(['/request', request.id]);
  }
}
