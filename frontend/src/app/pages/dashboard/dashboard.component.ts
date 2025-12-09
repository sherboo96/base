import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { DashboardService, DashboardStatistics } from '../../services/dashboard.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { LoadingComponent } from '../../components/loading/loading.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule, LoadingComponent, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  statistics: DashboardStatistics | null = null;
  isLoading: boolean = false;
  refreshInterval: any;

  constructor(
    private loadingService: LoadingService,
    private dashboardService: DashboardService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadStatistics();
    // Refresh dashboard data every 5 minutes
    this.refreshInterval = setInterval(() => this.refreshData(), 5 * 60 * 1000);
  }

  ngOnDestroy() {
    // Clear interval when component is destroyed
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  /**
   * Refresh dashboard data
   */
  refreshData() {
    this.loadStatistics(false); // Refresh without global loading overlay
  }

  /**
   * Load dashboard statistics
   * @param showGlobalLoader - Whether to show the global loading overlay
   */
  loadStatistics(showGlobalLoader: boolean = true) {
    this.isLoading = true;

    if (showGlobalLoader) {
      this.loadingService.show();
    }

    this.dashboardService
      .getStatistics()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          if (showGlobalLoader) {
            this.loadingService.hide();
          }
        })
      )
      .subscribe({
        next: (response) => {
          if (response.statusCode === 200 && response.result) {
            this.statistics = response.result;
          } else {
            this.toastr.error(response.message || 'Failed to load dashboard statistics');
          }
        },
        error: (error) => {
          console.error('Error loading dashboard statistics:', error);
          this.toastr.error(error.error?.message || 'Failed to load dashboard statistics');
        },
      });
  }

  getLoginMethodLabel(method: string): string {
    const methodMap: { [key: string]: string } = {
      KMNID: 'OTP Verification',
      ActiveDirectory: 'Active Directory',
      Credentials: 'Credentials',
    };
    return methodMap[method] || method;
  }

  getLoginMethodKeys(): string[] {
    if (!this.statistics || !this.statistics.usersByLoginMethod) {
      return [];
    }
    return Object.keys(this.statistics.usersByLoginMethod);
  }

  getOrganizationKeys(): string[] {
    if (!this.statistics || !this.statistics.usersByOrganization) {
      return [];
    }
    return Object.keys(this.statistics.usersByOrganization);
  }

  getLoginMethodColor(method: string): string {
    const colorMap: { [key: string]: string } = {
      KMNID: 'bg-blue-500',
      ActiveDirectory: 'bg-green-500',
      Credentials: 'bg-purple-500',
    };
    return colorMap[method] || 'bg-gray-500';
  }
}
