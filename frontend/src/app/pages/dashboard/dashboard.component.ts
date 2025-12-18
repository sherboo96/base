import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { DashboardService, DashboardStatistics, UserDashboardStatistics } from '../../services/dashboard.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';
import { finalize, forkJoin, catchError, of } from 'rxjs';
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
  userStatistics: UserDashboardStatistics | null = null;
  isLoading: boolean = false;
  refreshInterval: any;

  constructor(
    private loadingService: LoadingService,
    private dashboardService: DashboardService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) { }

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

    forkJoin({
      systemStats: this.dashboardService.getStatistics().pipe(
        catchError(error => {
          console.error('Error loading system statistics:', error);
          return of({ statusCode: 500, message: 'Failed to load system statistics', result: null });
        })
      ),
      userStats: this.dashboardService.getUserStatistics().pipe(
        catchError(error => {
          console.error('Error loading user statistics:', error);
          return of({ statusCode: 500, message: 'Failed to load user statistics', result: null });
        })
      )
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          if (showGlobalLoader) {
            this.loadingService.hide();
          }
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          // Handle System Statistics
          if (response.systemStats && response.systemStats.statusCode === 200 && response.systemStats.result) {
            this.statistics = response.systemStats.result as any;
          } else if (response.systemStats?.message) {
            // Optionally show warning or just log
            console.warn(response.systemStats.message);
          }

          // Handle User Statistics
          if (response.userStats && response.userStats.statusCode === 200 && response.userStats.result) {
            this.userStatistics = response.userStats.result as any;
          } else if (response.userStats?.message) {
            console.warn(response.userStats.message);
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Unexpected error in dashboard forkJoin:', error);
          this.toastr.error('An unexpected error occurred while loading dashboard data.');
        }
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
