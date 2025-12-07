import { Component, OnInit } from '@angular/core';
import { NavBarComponent } from '../../components/nav-bar/nav-bar.component';
import { SideMenuComponent } from '../../components/side-menu/side-menu.component';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../services/loading.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NavBarComponent, SideMenuComponent, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  kocSteps: any[] = [];
  kgocSteps: any[] = [];
  kpcSteps: any[] = [];
  isLoading: boolean = false;
  refreshInterval: any;

  constructor(private loadingService: LoadingService) {}

  ngOnInit() {
    // this.loadProgress();
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
    this.loadProgress(false); // Refresh without global loading overlay
  }

  /**
   * Load progress data using the DashboardService.
   * @param showGlobalLoader - Whether to show the global loading overlay
   */
  loadProgress(showGlobalLoader: boolean = true) {
    this.isLoading = true; // Local component loader

    if (showGlobalLoader) {
      this.loadingService.show(); // Global application loader
    }
  }
}
