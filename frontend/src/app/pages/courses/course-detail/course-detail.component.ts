import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseTabService, CourseTab } from '../../../services/course-tab.service';
import { LoadingService } from '../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule, LoadingComponent],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss',
})
export class CourseDetailComponent implements OnInit, OnDestroy {
  courseTab: CourseTab | null = null;
  isLoading = false;
  courseTabId: number | null = null;
  private subscriptions: Subscription[] = [];

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseTabService: CourseTabService,
    private loadingService: LoadingService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Use paramMap for better compatibility
    const routeCode = this.route.snapshot.paramMap.get('routeCode');
    
    if (routeCode && routeCode.trim() !== '') {
      this.loadCourseTabByRouteCode(routeCode);
    } else {
      // Also try params Observable as fallback
      this.route.params.subscribe((params) => {
        const routeCodeFromParams = params['routeCode'];
        if (routeCodeFromParams && routeCodeFromParams.trim() !== '') {
          this.loadCourseTabByRouteCode(routeCodeFromParams);
        } else {
          console.error('Route code not found in params:', params);
          this.toastr.error('Invalid course tab route code');
          this.router.navigate(['/dashboard']);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  loadCourseTabByRouteCode(routeCode: string): void {
    if (!routeCode || routeCode.trim() === '') {
      console.error('Empty routeCode provided');
      this.toastr.error('Invalid course tab route code');
      this.router.navigate(['/dashboard']);
      return;
    }

    // Decode routeCode in case it's URL encoded
    const decodedRouteCode = decodeURIComponent(routeCode);
    console.log('Loading course tab with routeCode:', decodedRouteCode);

    this.isLoading = true;
    this.loadingService.show();

    const sub = this.courseTabService
      .getCourseTabByRouteCode(decodedRouteCode)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response: any) => {
          // Handle both direct CourseTab and wrapped response
          this.courseTab = response.result || response;
          if (!this.courseTab) {
            console.error('Course tab not found in response:', response);
            this.toastr.error('Course tab not found');
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          console.error('Error loading course tab:', error);
          this.toastr.error(error.error?.message || 'Failed to load course tab');
          this.router.navigate(['/dashboard']);
        },
      });

    this.subscriptions.push(sub);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
