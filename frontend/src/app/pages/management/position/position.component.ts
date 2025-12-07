import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Position,
  PositionService,
  PositionResponse,
} from '../../../services/position.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DialogService } from '../../../services/dialog.service';
import { PositionFormComponent } from './position-form/position-form.component';
@Component({
  selector: 'app-position',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './position.component.html',
})
export class PositionComponent implements OnInit, OnDestroy {
  positions: Position[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private positionService: PositionService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.fetchPositions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchPositions(): void {
    this.isLoading = true;
    this.loadingService.show();

    const sub = this.positionService
      .getPositions(this.currentPage, this.pageSize)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.positions = response.result;
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          this.toastr.error(error.error.message || 'Failed to fetch positions');
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.fetchPositions();
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
    this.fetchPositions();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.fetchPositions();
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

  viewPositionDetails(position: Position): void {
    this.router.navigate(['/position', position.id]);
  }

  addNewPosition(): void {
    this.dialogService.openDialog(PositionFormComponent);

    const sub = this.dialogService.dialogState$.subscribe((state) => {
      if (!state.isOpen) {
        this.fetchPositions();
      }
    });

    this.subscriptions.push(sub);
  }
}
