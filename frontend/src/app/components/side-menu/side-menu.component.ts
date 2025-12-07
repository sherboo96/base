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

  constructor(private router: Router, private storageService: StorageService) {
    this.router.events.subscribe((event: any) => {
      if (event.url) {
        this.activeRoute = event.url;
      }
    });

    // Load user permissions from localStorage
    const storedPermissions =
      this.storageService.getItem<string>('userPermissions');

    if (storedPermissions) {
      this.userPermissions = JSON.parse(storedPermissions);
    }
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  hasPermission(permissionCode: string): boolean {
    return this.userPermissions.some((p) => p.code === permissionCode);
  }

  // Main Navigation
  navigateToDashboard() {
    this.activeRoute = '/dashboard';
    this.router.navigate(['/dashboard']);
  }

  // Management
  navigateToOrganization() {
    if (this.hasPermission('UMS0000')) {
      this.activeRoute = '/management/organization';
      this.router.navigate(['/management/organization']);
    }
  }

  navigateToDepartment() {
    if (this.hasPermission('UMS0001')) {
      this.activeRoute = '/management/department';
      this.router.navigate(['/management/department']);
    }
  }

  navigateToPositions() {
    if (this.hasPermission('UMS0010')) {
      this.activeRoute = '/management/positions';
      this.router.navigate(['/management/positions']);
    }
  }

  navigateToUsers() {
    if (this.hasPermission('UMS0011')) {
      this.activeRoute = '/management/users';
      this.router.navigate(['/management/users']);
    }
  }

  navigateToUserRoles() {
    if (this.hasPermission('UMS0111')) {
      this.activeRoute = '/management/userRoles';
      this.router.navigate(['/management/userRoles']);
    }
  }

  navigateToPermissions() {
    if (this.hasPermission('UMS0100')) {
      this.activeRoute = '/management/permissions';
      this.router.navigate(['/management/permissions']);
    }
  }

  navigateToRoles() {
    if (this.hasPermission('UMS0101')) {
      this.activeRoute = '/management/roles';
      this.router.navigate(['/management/roles']);
    }
  }

  navigateToRolePermissions() {
    if (this.hasPermission('UMS1001')) {
      this.activeRoute = '/management/rolePermissions';
      this.router.navigate(['/management/rolePermissions']);
    }
  }

  navigateToRoleSystems() {
    if (this.hasPermission('UMS1010')) {
      this.activeRoute = '/management/roleSystems';
      this.router.navigate(['/management/roleSystems']);
    }
  }

  navigateToSystems() {
    if (this.hasPermission('UMS0110')) {
      this.activeRoute = '/management/systems';
      this.router.navigate(['/management/systems']);
    }
  }

  navigateToUserSystems() {
    if (this.hasPermission('UMS1000')) {
      this.activeRoute = '/management/userSystems';
      this.router.navigate(['/management/userSystems']);
    }
  }
}
