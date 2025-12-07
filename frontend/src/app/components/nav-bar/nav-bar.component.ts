import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSwitcherComponent, TranslateModule],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css',
})
export class NavBarComponent {
  dropdownOpen = false;
  name = '';
  role = '';
  avatarImage: string | null = null;

  // Map of route paths to translation keys
  private pageTitleKeys: { [key: string]: string } = {
    '/dashboard': 'navbar.dashboard',
    '/invoices': 'common.invoices',
    '/profile': 'navbar.myProfile',
    // Management
    '/management/users': 'navbar.users',
    '/management/organization': 'navbar.organizations',
    '/management/department': 'navbar.departments',
    '/management/positions': 'navbar.positions',
    '/management/job-titles': 'navbar.jobTitles',
    '/management/systems': 'navbar.systems',
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private storageService: StorageService,
    private translationService: TranslationService
  ) {
    // Initialize user info from encrypted storage
    const currentUser = this.storageService.getItem<any>('currentUser');
    if (currentUser) {
      this.name = currentUser.fullName || 'User';
      this.role = currentUser.position?.title || 'Ministry User';
    }
  }

  /**
   * Get the current page title based on the current URL path
   */
  getCurrentPageTitle(): string {
    const currentPath = this.router.url.split('?')[0]; // Remove query parameters

    // Check for exact match
    if (this.pageTitleKeys[currentPath]) {
      return this.translationService.instant(this.pageTitleKeys[currentPath]);
    }

    // If no exact match, try to find a parent route
    // For example, if we have /kpc/prices/details, try to match with /kpc/prices
    for (const path in this.pageTitleKeys) {
      if (currentPath.startsWith(path + '/')) {
        return this.translationService.instant(this.pageTitleKeys[path]);
      }
    }

    // Default fallback
    return this.translationService.instant('navbar.ministryOfOil');
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  logout() {
    this.authService.logout();
    window.location.reload();
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.dropdownOpen = false; // Close dropdown when clicking outside
    }
  }

  getInitials(): string {
    return this.name.charAt(0).toUpperCase();
  }

  routeToProfile() {
    this.dropdownOpen = false;
    this.router.navigate(['/profile']);
  }
}
