import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, ActivatedRoute } from '@angular/router';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './components/loading/loading.component';
import { TranslationService } from './services/translation.service';
import { AuthService } from './services/auth.service';
import { ProfileCompletionGuard } from './guards/profile-completion.guard';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    SideMenuComponent,
    NavBarComponent,
    CommonModule,
    LoadingComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  shouldHideNavigation = false;

  constructor(
    public router: Router,
    private activatedRoute: ActivatedRoute,
    private translationService: TranslationService,
    private authService: AuthService,
    private profileCompletionGuard: ProfileCompletionGuard
  ) {}

  ngOnInit(): void {
    // Initialize translation service to set language and direction
    this.translationService.getCurrentLanguage();

    // Listen to route changes to update navigation visibility and check authentication
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.shouldHideNavigation = this.shouldHideNavigationForCurrentRoute();
        
        // Check authentication on route change (except for login, profile-completion, and public routes)
        const currentUrl = this.router.url;
        if (!currentUrl.startsWith('/login') && 
            !currentUrl.startsWith('/events/') && 
            !currentUrl.startsWith('/unauthorized') &&
            !currentUrl.startsWith('/profile-completion')) {
          if (!this.authService.isAuthenticated()) {
            // User is not authenticated, redirect to login
            this.router.navigate(['/login'], { replaceUrl: true });
          } else {
            // Check profile completion for authenticated users
            this.checkProfileCompletion();
          }
        }
      });

    // Check initial route
    this.shouldHideNavigation = this.shouldHideNavigationForCurrentRoute();
    
    // Check authentication on app initialization
    const currentUrl = this.router.url;
    if (!currentUrl.startsWith('/login') && 
        !currentUrl.startsWith('/events/') && 
        !currentUrl.startsWith('/unauthorized') &&
        !currentUrl.startsWith('/profile-completion')) {
      if (!this.authService.isAuthenticated()) {
        // User is not authenticated, redirect to login
        this.router.navigate(['/login'], { replaceUrl: true });
      } else {
        // Check profile completion for authenticated users
        this.checkProfileCompletion();
      }
    }
  }

  private checkProfileCompletion(): void {
    this.authService.isProfileCompletionRequired().subscribe({
      next: (response: any) => {
        if (response.statusCode === 200 && response.result === true) {
          const currentUrl = this.router.url;
          // Only redirect if not already on profile completion page
          if (!currentUrl.startsWith('/profile-completion')) {
            this.router.navigate(['/profile-completion'], { replaceUrl: true });
          }
        }
      },
      error: (error) => {
        // On error, don't block navigation
        console.error('Error checking profile completion:', error);
      },
    });
  }

  // Helper method to check if the current route should hide side-menu and navbar
  isLoginRoute(): boolean {
    return this.shouldHideNavigation;
  }

  // Check if navigation should be hidden for the current route
  private shouldHideNavigationForCurrentRoute(): boolean {
    const url = this.router.url;
    
    // Hide for login page
    if (url === '/login') {
      return true;
    }
    
    // Hide for profile completion page
    if (url === '/profile-completion') {
      return true;
    }
    
    // Hide for public routes (events registration, etc.)
    if (url.startsWith('/events/')) {
      return true;
    }
    
    return false;
  }
}
