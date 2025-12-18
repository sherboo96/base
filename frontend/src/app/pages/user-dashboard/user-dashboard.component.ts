import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardService, UserDashboardStatistics } from '../../services/dashboard.service';
import { LoadingComponent } from '../../components/loading/loading.component';

@Component({
    selector: 'app-user-dashboard',
    standalone: true,
    imports: [CommonModule, TranslateModule, LoadingComponent],
    templateUrl: './user-dashboard.component.html',
    styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
    isLoading = false;
    stats: UserDashboardStatistics | null = null;
    currentYear = new Date().getFullYear();

    constructor(
        private dashboardService: DashboardService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadStats();
    }

    loadStats(): void {
        this.isLoading = true;
        this.cdr.detectChanges(); // Update loading state immediately
        
        this.dashboardService.getUserStatistics().subscribe({
            next: (response) => {
                console.log('User statistics response:', response);
                if (response && response.result) {
                    // Map backend PascalCase to frontend camelCase and create new object reference
                    const result = response.result as any;
                    this.stats = {
                        approvedCourses: result.ApprovedCourses || result.approvedCourses || [],
                        approvedCoursesCount: result.ApprovedCoursesCount ?? result.approvedCoursesCount ?? 0,
                        attendedCourses: result.AttendedCourses || result.attendedCourses || [],
                        attendedCoursesCount: result.AttendedCoursesCount ?? result.attendedCoursesCount ?? 0,
                        attendedHours: result.AttendedHours ?? result.attendedHours ?? 0,
                        rank: result.Rank ?? result.rank ?? 0,
                        organizationId: result.OrganizationId ?? result.organizationId ?? 0
                    };
                    console.log('Stats assigned:', this.stats);
                    
                    // Use setTimeout to ensure change detection runs after the async operation
                    setTimeout(() => {
                        this.cdr.detectChanges();
                    }, 0);
                } else {
                    console.warn('Response or result is null/undefined');
                    this.stats = null;
                }
                this.isLoading = false;
                setTimeout(() => {
                    this.cdr.detectChanges();
                }, 0);
            },
            error: (error) => {
                console.error('Error loading user dashboard stats:', error);
                this.isLoading = false;
                this.stats = null;
                setTimeout(() => {
                    this.cdr.detectChanges();
                }, 0);
            }
        });
    }

    getRankDisplay(rank: number): string {
        // Format rank (e.g., 1st, 2nd, 3rd)
        if (!rank) return '-';
        const j = rank % 10,
            k = rank % 100;
        if (j == 1 && k != 11) {
            return rank + "st";
        }
        if (j == 2 && k != 12) {
            return rank + "nd";
        }
        if (j == 3 && k != 13) {
            return rank + "rd";
        }
        return rank + "th";
    }
}
