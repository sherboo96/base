import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css',
})
export class NavBarComponent {
  dropdownOpen = false;
  name = '';
  role = '';
  avatarImage: string | null = null;

  // Map of route paths to display names
  private pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/invoices': 'Invoices',
    '/profile': 'My Profile',
    // Management
    '/management/users': 'Users',
    '/management/organization': 'Organizations',
    '/management/department': 'Departments',
    '/management/positions': 'Positions',
    '/management/systems': 'Systems',
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private storageService: StorageService
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
    if (this.pageTitles[currentPath]) {
      return this.pageTitles[currentPath];
    }

    // If no exact match, try to find a parent route
    // For example, if we have /kpc/prices/details, try to match with /kpc/prices
    for (const path in this.pageTitles) {
      if (currentPath.startsWith(path + '/')) {
        return this.pageTitles[path];
      }
    }

    // Default fallback
    return 'Ministry of Oil';
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
