import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { TranslateModule } from '@ngx-translate/core';
import { SideMenuService } from '../../services/side-menu.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './side-menu.component.html',
  styleUrl: './side-menu.component.css',
})
export class SideMenuComponent implements OnInit, OnDestroy {
  activeRoute: string = '';
  currentYear: number = new Date().getFullYear();
  userPermissions: any[] = [];
  sideMenuPermissions: any[] = [];
  isCollapsed: boolean = false;
  private subscription?: Subscription;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private sideMenuService: SideMenuService
  ) {
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

  ngOnInit(): void {
    this.subscription = this.sideMenuService.collapsed$.subscribe(
      (collapsed) => {
        this.isCollapsed = collapsed;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleCollapse(): void {
    this.sideMenuService.toggle();
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  hasPermission(permissionCode: string): boolean {
    // Check if user has SuperAdmin role
    const userRoles = this.storageService.getItem<any[]>('userRoles');
    const isSuperAdmin = userRoles?.some((role: any) => role.name === 'SuperAdmin');
    
    // SuperAdmin has access to everything
    if (isSuperAdmin) {
      return true;
    }
    
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

  navigateToSegments() {
    this.activeRoute = '/management/segment';
    this.router.navigate(['/management/segment']);
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

  navigateToLocation() {
    this.activeRoute = '/management/location';
    this.router.navigate(['/management/location']);
  }

  navigateToInstructor() {
    this.activeRoute = '/management/instructor';
    this.router.navigate(['/management/instructor']);
  }

  navigateToInstitution() {
    this.activeRoute = '/management/institution';
    this.router.navigate(['/management/institution']);
  }

  navigateToUsers() {
    this.activeRoute = '/management/users';
    this.router.navigate(['/management/users']);
  }

  navigateToRoles() {
    this.activeRoute = '/management/roles';
    this.router.navigate(['/management/roles']);
  }

  navigateToSystemConfiguration() {
    this.activeRoute = '/management/system-configuration';
    this.router.navigate(['/management/system-configuration']);
  }

  navigateToAdoptionUser() {
    this.activeRoute = '/management/adoption-user';
    this.router.navigate(['/management/adoption-user']);
  }

  get copyrightParams() {
    return { year: this.currentYear };
  }

  // Check if section has any visible items
  hasManagementItems(): boolean {
    return this.hasPermission('ORGANIZATIONS_VIEW') ||
           this.hasPermission('DEPARTMENTS_VIEW') ||
           this.hasPermission('JOB_TITLES_VIEW') ||
           this.hasPermission('POSITIONS_VIEW') ||
           this.hasPermission('LOCATIONS_VIEW');
  }

  hasUserManagementItems(): boolean {
    return this.hasPermission('USERS_VIEW') ||
           this.hasPermission('SEGMENTS_VIEW');
  }

  hasRoleManagementItems(): boolean {
    return this.hasPermission('ROLES_VIEW');
  }

  hasCourseConfigurationItems(): boolean {
    return this.hasPermission('ADOPTION_USERS_VIEW') ||
           this.hasPermission('INSTRUCTORS_VIEW') ||
           this.hasPermission('INSTITUTIONS_VIEW');
  }

  hasSystemAdministrationItems(): boolean {
    return this.hasPermission('SYSTEM_CONFIG_VIEW');
  }
}
