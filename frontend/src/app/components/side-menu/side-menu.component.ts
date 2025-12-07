import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-menu.component.html',
  styleUrl: './side-menu.component.css',
})
export class SideMenuComponent {
  activeRoute: string = '';
  currentYear: number = new Date().getFullYear();
  userPermissions: any[] = [];
  sideMenuPermissions: any[] = [];

  constructor(private router: Router, private storageService: StorageService) {
    this.router.events.subscribe((event: any) => {
      if (event.url) {
        this.activeRoute = event.url;
      }
    });

    // Load user permissions from storage
    const storedPermissions = this.storageService.getItem<any[]>('userPermissions');
    if (storedPermissions) {
      this.userPermissions = storedPermissions;
    }

    // Load side menu permissions from storage
    const storedSideMenu = this.storageService.getItem<any[]>('sideMenuPermissions');
    if (storedSideMenu) {
      this.sideMenuPermissions = storedSideMenu;
    }
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  hasPermission(permissionCode: string): boolean {
    // First check side menu permissions (more efficient)
    const sideMenuItem = this.sideMenuPermissions.find((item) => item.code === permissionCode);
    if (sideMenuItem) {
      return sideMenuItem.hasAccess;
    }
    // Fallback to checking user permissions
    return this.userPermissions.some((p) => p.code === permissionCode);
  }

  getSideMenuItems(section: string): any[] {
    return this.sideMenuPermissions.filter((item) => item.section === section && item.hasAccess);
  }

  // Main Navigation
  navigateToDashboard() {
    this.activeRoute = '/dashboard';
    this.router.navigate(['/dashboard']);
  }

  // Management
  navigateToOrganization() {
    this.activeRoute = '/management/organization';
    this.router.navigate(['/management/organization']);
  }

  navigateToDepartment() {
    this.activeRoute = '/management/department';
    this.router.navigate(['/management/department']);
  }

  navigateToPositions() {
    this.activeRoute = '/management/positions';
    this.router.navigate(['/management/positions']);
  }

  navigateToJobTitles() {
    this.activeRoute = '/management/job-titles';
    this.router.navigate(['/management/job-titles']).then((success) => {
      if (!success) {
        console.error('Failed to navigate to job titles page');
      }
    });
  }

  navigateToUsers() {
    this.activeRoute = '/management/users';
    this.router.navigate(['/management/users']);
  }

  navigateToRoles() {
    this.activeRoute = '/management/roles';
    this.router.navigate(['/management/roles']);
  }
}
