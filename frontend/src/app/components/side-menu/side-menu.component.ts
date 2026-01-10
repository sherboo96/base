import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { TranslateModule } from '@ngx-translate/core';
import { SideMenuService } from '../../services/side-menu.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';
import { CourseTabService, CourseTab } from '../../services/course-tab.service';
import { CourseService, Course, CourseStatus } from '../../services/course.service';
import { ToastrService } from 'ngx-toastr';

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
  courseTabs: CourseTab[] = [];
  publicCourseTabs: CourseTab[] = [];
  digitalLibraryTabs: CourseTab[] = [];
  digitalLibraryManagementTabs: CourseTab[] = [];
  coursesByTab: Map<number, Course[]> = new Map();
  publicCoursesByTab: Map<number, Course[]> = new Map();
  isLoadingCourseTabs = false;
  isLoadingCourses = false;
  private subscription?: Subscription;
  private routerSubscription?: Subscription;
  private courseTabChangeSubscription?: Subscription;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private sideMenuService: SideMenuService,
    private courseTabService: CourseTabService,
    private courseService: CourseService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    // Subscribe to router events for active route tracking
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.activeRoute = event.urlAfterRedirects;
        // Reload course tabs when navigating to dashboard, course-related pages, or digital library pages
        if (event.urlAfterRedirects === '/dashboard' ||
          event.urlAfterRedirects.startsWith('/courses') ||
          event.urlAfterRedirects.startsWith('/management/courses') ||
          event.urlAfterRedirects.startsWith('/digital-library') ||
          event.urlAfterRedirects.startsWith('/management/digital-library')) {
          this.reloadPermissions();
          setTimeout(() => {
            this.loadCourseTabs();
          }, 100);
        }

        // Update active route
        this.activeRoute = event.urlAfterRedirects;
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
    const subscriptions = new Subscription();

    subscriptions.add(
      this.sideMenuService.collapsed$.subscribe(
        (collapsed) => {
          this.isCollapsed = collapsed;
        }
      )
    );

    // Subscribe to course tab changes to reload side menu when tabs are modified
    this.courseTabChangeSubscription = this.courseTabService.courseTabChanged.subscribe(() => {
      this.loadCourseTabs();
    });

    // Subscribe to course changes to reload courses when they are modified
    subscriptions.add(
      this.courseService.courseChanged.subscribe(() => {
        this.loadCoursesForTabs();
      })
    );

    this.subscription = subscriptions;

    // Reload permissions from storage to ensure they're available
    this.reloadPermissions();

    // Set initial active route
    this.activeRoute = this.router.url;

    // Load course tabs after a short delay to ensure permissions are loaded
    setTimeout(() => {
      this.loadCourseTabs();
    }, 100);
  }

  reloadPermissions(): void {
    // Reload user permissions from storage
    const storedPermissions = this.storageService.getItem<any[]>('userPermissions');
    if (storedPermissions && Array.isArray(storedPermissions)) {
      this.userPermissions = storedPermissions;
    } else {
      this.userPermissions = [];
    }

    // Reload side menu permissions from storage
    const storedSideMenu = this.storageService.getItem<any[]>('sideMenuPermissions');
    if (storedSideMenu && Array.isArray(storedSideMenu)) {
      this.sideMenuPermissions = storedSideMenu;
    } else {
      this.sideMenuPermissions = [];
    }
  }

  async loadCourseTabs(): Promise<void> {
    try {
      this.isLoadingCourseTabs = true;

      // Ensure permissions are loaded before checking
      this.reloadPermissions();

      const currentUser = this.storageService.getItem<any>('currentUser');
      if (!currentUser) {
        this.isLoadingCourseTabs = false;
        return;
      }

      // Get user's organization ID
      const userOrganizationId = currentUser.organizationId || currentUser.organization?.id;

      // Check if user is SuperAdmin (SuperAdmin bypasses permission checks)
      const userRoles = this.storageService.getItem<any[]>('userRoles');
      const isSuperAdmin = userRoles?.some((role: any) => role.name === 'SuperAdmin');

      // Check permissions first - reload permissions to ensure they're fresh
      this.reloadPermissions();

      // Check for permissions - use fallback to COURSE_TABS_VIEW if new permissions not assigned
      const hasCourseTabsView = this.hasPermission('COURSE_TABS_VIEW');
      let hasShowInMenuPermission = isSuperAdmin ||
        this.hasPermission('COURSE_TABS_SHOW_IN_MENU') ||
        hasCourseTabsView; // Fallback
      let hasShowPublicPermission = isSuperAdmin ||
        this.hasPermission('COURSE_TABS_SHOW_PUBLIC') ||
        hasCourseTabsView; // Fallback

      // If no permissions and not SuperAdmin, check if permissions might not be loaded yet and retry once
      if (!isSuperAdmin && !hasShowInMenuPermission && !hasShowPublicPermission) {
        // Wait a bit and check again - permissions might be loading
        await new Promise(resolve => setTimeout(resolve, 200));
        this.reloadPermissions();
        const retryCourseTabsView = this.hasPermission('COURSE_TABS_VIEW');
        hasShowInMenuPermission = this.hasPermission('COURSE_TABS_SHOW_IN_MENU') || retryCourseTabsView;
        hasShowPublicPermission = this.hasPermission('COURSE_TABS_SHOW_PUBLIC') || retryCourseTabsView;

        if (!hasShowInMenuPermission && !hasShowPublicPermission) {
          // Course tabs not shown: User lacks required permissions
          this.courseTabs = [];
          this.publicCourseTabs = [];
          this.isLoadingCourseTabs = false;
          this.cdr.detectChanges();
          return;
        }
      }

      // Use final permission values
      const finalShowInMenuPermission = isSuperAdmin || hasShowInMenuPermission;
      const finalShowPublicPermission = isSuperAdmin || hasShowPublicPermission;

      // Fetch CourseTabs for "COURSES MANAGEMENT" section (ShowInMenu = true)
      if (finalShowInMenuPermission) {
        const menuResponse = await firstValueFrom(
          this.courseTabService.getCourseTabs(1, 1000, undefined, userOrganizationId, true, undefined)
        );

        if (menuResponse && menuResponse.result && Array.isArray(menuResponse.result)) {
          // Filter to only show active CourseTabs that are set to show in menu
          this.courseTabs = menuResponse.result.filter(
            (tab: CourseTab) =>
              tab &&
              tab.isActive !== false &&
              tab.isDeleted !== true &&
              tab.showInMenu === true
          );
          // Trigger change detection to update the side menu
          this.cdr.detectChanges();
        } else {
          this.courseTabs = [];
          // Trigger change detection even when clearing
          this.cdr.detectChanges();
        }
      } else {
        this.courseTabs = [];
        this.cdr.detectChanges();
      }

      // Fetch CourseTabs for "COURSES" section (ShowPublic = true)
      if (finalShowPublicPermission) {
        const publicResponse = await firstValueFrom(
          this.courseTabService.getCourseTabs(1, 1000, undefined, userOrganizationId, undefined, true)
        );

        if (publicResponse && publicResponse.result && Array.isArray(publicResponse.result)) {
          // Filter to only show active CourseTabs that are set to show public
          this.publicCourseTabs = publicResponse.result.filter(
            (tab: CourseTab) =>
              tab &&
              tab.isActive !== false &&
              tab.isDeleted !== true &&
              tab.showPublic === true
          );
          // Trigger change detection to update the side menu
          this.cdr.detectChanges();
        } else {
          this.publicCourseTabs = [];
          // Trigger change detection even when clearing
          this.cdr.detectChanges();
        }
      } else {
        this.publicCourseTabs = [];
      }

      // Fetch CourseTabs for "DIGITAL LIBRARY" section
      const hasDigitalLibraryView = this.hasPermission('DIGITAL_LIBRARY_VIEW');
      const hasDigitalLibraryManagementView = this.hasPermission('DIGITAL_LIBRARY_MANAGEMENT_VIEW');

      if (hasDigitalLibraryView || hasDigitalLibraryManagementView || isSuperAdmin) {
        // Fetch all tabs for the organization to filter locally for Digital Library
        const allTabsResponse = await firstValueFrom(
          this.courseTabService.getCourseTabs(1, 1000, undefined, userOrganizationId)
        );

        if (allTabsResponse && allTabsResponse.result) {
          const allTabs = allTabsResponse.result as CourseTab[];

          // Public Digital Library tabs (showDigitalLibraryPublic = true)
          if (hasDigitalLibraryView || isSuperAdmin) {
            this.digitalLibraryTabs = allTabs.filter(t =>
              t.isActive !== false &&
              !t.isDeleted &&
              t.showDigitalLibraryPublic === true
            );
          } else {
            this.digitalLibraryTabs = [];
          }

          // Management Digital Library tabs (showDigitalLibraryInMenu = true)
          if (hasDigitalLibraryManagementView || isSuperAdmin) {
            this.digitalLibraryManagementTabs = allTabs.filter(t =>
              t.isActive !== false &&
              !t.isDeleted &&
              t.showDigitalLibraryInMenu === true
            );
          } else {
            this.digitalLibraryManagementTabs = [];
          }
        }
      } else {
        this.digitalLibraryTabs = [];
        this.digitalLibraryManagementTabs = [];
      }
      this.cdr.detectChanges();

      // Load courses for each course tab
      await this.loadCoursesForTabs();
    } catch (error) {
      this.courseTabs = [];
      this.publicCourseTabs = [];
    } finally {
      this.isLoadingCourseTabs = false;
      this.isLoadingCourses = false;
    }
  }

  async loadCoursesForTabs(): Promise<void> {
    try {
      this.isLoadingCourses = true;
      const currentUser = this.storageService.getItem<any>('currentUser');
      const userOrganizationId = currentUser?.organizationId || currentUser?.organization?.id;

      // Load courses for management tabs (all statuses)
      for (const tab of this.courseTabs) {
        try {
          const response = await firstValueFrom(
            this.courseService.getCourses(1, 1000, undefined, userOrganizationId, tab.id)
          ) as any;
          if (response && response.result && Array.isArray(response.result)) {
            this.coursesByTab.set(tab.id, response.result.filter((c: Course) => c.isActive !== false && !c.isDeleted));
          }
        } catch (error) {
          this.coursesByTab.set(tab.id, []);
        }
      }

      // Load courses for public tabs (only Published status)
      for (const tab of this.publicCourseTabs) {
        try {
          const response = await firstValueFrom(
            this.courseService.getCourses(1, 1000, undefined, userOrganizationId, tab.id, CourseStatus.Published)
          ) as any;
          if (response && response.result && Array.isArray(response.result)) {
            this.publicCoursesByTab.set(tab.id, response.result.filter((c: Course) => c.isActive !== false && !c.isDeleted));
          }
        } catch (error) {
          this.publicCoursesByTab.set(tab.id, []);
        }
      }

      this.cdr.detectChanges();
    } catch (error) {
    } finally {
      this.isLoadingCourses = false;
    }
  }

  getCoursesForTab(tabId: number): Course[] {
    return this.coursesByTab.get(tabId) || [];
  }

  getPublicCoursesForTab(tabId: number): Course[] {
    return this.publicCoursesByTab.get(tabId) || [];
  }

  navigateToAddCourse(courseTabId: number): void {
    this.activeRoute = `/management/courses/${courseTabId}`;
    this.router.navigate(['/management/courses', courseTabId]);
  }

  navigateToCourseManagement(courseTabId: number): void {
    this.activeRoute = `/management/courses/${courseTabId}`;
    this.router.navigate(['/management/courses', courseTabId]);
  }

  navigateToCourseDetails(courseId: number | undefined): void {
    if (courseId) {
      this.router.navigate(['/management/courses/details', courseId]);
    }
  }

  isActiveCourseRoute(courseTabId: number, courseId?: number): boolean {
    const currentUrl = this.router.url;

    // Check if we are in course details page (e.g. /management/courses/details/123)
    // and if the current course belongs to this tab
    if (currentUrl.startsWith('/management/courses/details/')) {
      const parts = currentUrl.split('/');
      const idStr = parts[parts.length - 1];
      const cId = parseInt(idStr, 10);
      if (!isNaN(cId)) {
        const courses = this.coursesByTab.get(courseTabId);
        if (courses && courses.some(c => c.id === cId)) {
          return true;
        }
      }
    }

    if (courseId) {
      // Check if we're on the course details page for this course
      return currentUrl === `/management/courses/details/${courseId}` ||
        currentUrl === `/management/courses/${courseTabId}/${courseId}`;
    }
    // Check if URL matches the course tab route (with or without trailing slash)
    return currentUrl === `/management/courses/${courseTabId}` ||
      currentUrl === `/management/courses/${courseTabId}/` ||
      (currentUrl.startsWith('/management/courses/') &&
        !currentUrl.startsWith('/management/courses/details/') &&
        currentUrl.split('/').length === 4 &&
        currentUrl.split('/')[3] === courseTabId.toString());
  }

  isActivePublicCourseRoute(courseTabId: number, courseId?: number): boolean {
    const courseTab = this.publicCourseTabs.find(t => t.id === courseTabId);
    if (!courseTab?.routeCode) return false;

    if (courseId) {
      return this.router.url === `/courses/${courseTab.routeCode}/${courseId}`;
    }
    return this.router.url.startsWith(`/courses/${courseTab.routeCode}`);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.courseTabChangeSubscription) {
      this.courseTabChangeSubscription.unsubscribe();
    }
  }

  toggleCollapse(): void {
    this.sideMenuService.toggle();
  }

  isActiveRoute(route: string): boolean {
    const currentUrl = this.router.url;
    // Exact match or match with trailing slash, but not if current URL continues beyond the route
    return currentUrl === route ||
      currentUrl === route + '/' ||
      (currentUrl.startsWith(route + '/') && route !== '/');
  }

  hasPermission(permissionCode: string): boolean {
    // Check if user has SuperAdmin role
    const userRoles = this.storageService.getItem<any[]>('userRoles');
    const isSuperAdmin = userRoles?.some((role: any) => role.name === 'SuperAdmin');

    // SuperAdmin has access to everything
    if (isSuperAdmin) {
      return true;
    }

    // Ensure permissions arrays are populated
    if (!this.userPermissions || this.userPermissions.length === 0) {
      this.reloadPermissions();
    }

    // First check side menu permissions (more efficient)
    if (this.sideMenuPermissions && this.sideMenuPermissions.length > 0) {
      const sideMenuItem = this.sideMenuPermissions.find((item) => item && item.code === permissionCode);
      if (sideMenuItem) {
        return sideMenuItem.hasAccess === true;
      }
    }

    // Fallback to checking user permissions
    if (this.userPermissions && this.userPermissions.length > 0) {
      const hasPermission = this.userPermissions.some((p) => {
        // Handle both object format {code: "PERMISSION_CODE"} and string format
        if (typeof p === 'string') {
          return p === permissionCode;
        }
        return p && (p.code === permissionCode || p === permissionCode);
      });
      return hasPermission;
    }

    return false;
  }

  getSideMenuItems(section: string): any[] {
    return this.sideMenuPermissions.filter((item) => item.section === section && item.hasAccess);
  }

  // Main Navigation
  navigateToDashboard() {
    // Legacy method - redirect based on permissions
    if (this.hasPermission('DASHBOARD_VIEW')) {
      this.navigateToSystemDashboard();
    } else {
      this.navigateToUserDashboard();
    }
  }

  navigateToSystemDashboard() {
    this.activeRoute = '/dashboard';
    this.router.navigate(['/dashboard']);
  }

  navigateToUserDashboard() {
    this.activeRoute = '/user-dashboard';
    this.router.navigate(['/user-dashboard']);
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

  navigateToPublic() {
    this.activeRoute = '/management/public';
    this.router.navigate(['/management/public']);
  }

  navigateToLogs() {
    this.activeRoute = '/management/logs';
    this.router.navigate(['/management/logs']);
  }

  navigateToAdoptionUser() {
    this.activeRoute = '/management/adoption-user';
    this.router.navigate(['/management/adoption-user']);
  }

  navigateToEvents() {
    this.activeRoute = '/management/events';
    this.router.navigate(['/management/events']);
  }

  navigateToEventOrganizations() {
    this.activeRoute = '/management/event-organizations';
    this.router.navigate(['/management/event-organizations']);
  }

  navigateToEventSpeakers() {
    this.activeRoute = '/management/event-speakers';
    this.router.navigate(['/management/event-speakers']);
  }

  navigateToEventSessions() {
    this.activeRoute = '/management/event-sessions';
    this.router.navigate(['/management/event-sessions']);
  }

  navigateToCourseTab() {
    this.activeRoute = '/management/course-tab';
    this.router.navigate(['/management/course-tab']);
  }

  navigateToCourseTabApprovals() {
    this.activeRoute = '/management/course-tab-approvals';
    this.router.navigate(['/management/course-tab-approvals']);
  }

  navigateToRequests() {
    this.activeRoute = '/requests';
    this.router.navigate(['/requests']);
  }

  navigateToCourse(courseTab: CourseTab, isManagement: boolean = false): void {
    // Check if routeCode exists - show helpful message if missing
    if (!courseTab.routeCode || courseTab.routeCode.trim() === '') {
      this.toastr.warning(
        `Course tab "${courseTab.name}" is missing a route code. Please add a route code in the Course Tab management page.`,
        'Route Code Required',
        { timeOut: 5000 }
      );
      // Navigate to course tab management page so user can add route code
      this.router.navigate(['/management/course-tab']);
      return;
    }

    if (isManagement) {
      // Navigate to management course page
      this.activeRoute = `/management/courses/${courseTab.routeCode}`;
      this.router.navigate(['/management/courses', courseTab.routeCode]);
    } else {
      // Navigate to public course page
      this.activeRoute = `/courses/${courseTab.routeCode}`;
      this.router.navigate(['/courses', courseTab.routeCode]);
    }
  }

  hasCourseTabs(): boolean {
    return Array.isArray(this.courseTabs) && this.courseTabs.length > 0;
  }

  hasPublicCourseTabs(): boolean {
    return Array.isArray(this.publicCourseTabs) && this.publicCourseTabs.length > 0;
  }

  getIconClasses(icon: string | undefined): string {
    if (!icon) return 'material-icons';
    return icon;
  }

  getIconName(icon: string | undefined): string {
    if (!icon) return 'book';
    // Extract icon name from Material Icons format "material-icons icon_name"
    if (icon.startsWith('material-icons ')) {
      return icon.replace('material-icons ', '');
    }
    return '';
  }

  isMaterialIcon(icon: string | undefined): boolean {
    if (!icon) return true; // Default to material-icons
    return icon.startsWith('material-icons ');
  }

  hasDigitalLibraryItems(): boolean {
    return this.digitalLibraryTabs && this.digitalLibraryTabs.length > 0;
  }

  hasDigitalLibraryManagementItems(): boolean {
    return this.digitalLibraryManagementTabs && this.digitalLibraryManagementTabs.length > 0;
  }

  navigateToDigitalLibrary(courseTab: CourseTab): void {
    if (!courseTab.routeCode) return;
    this.activeRoute = `/digital-library/${courseTab.routeCode}`;
    this.router.navigate(['/digital-library', courseTab.routeCode]);
  }

  navigateToDigitalLibraryManagement(courseTab: CourseTab): void {
    if (!courseTab.routeCode) return;
    this.activeRoute = `/management/digital-library/${courseTab.routeCode}`;
    this.router.navigate(['/management/digital-library', courseTab.routeCode]);
  }

  trackByCourseTabId(index: number, courseTab: CourseTab): number {
    return courseTab?.id || index;
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

  hasEventsItems(): boolean {
    return this.hasPermission('EVENTS_VIEW') ||
      this.hasPermission('EVENT_ORGANIZATIONS_VIEW') ||
      this.hasPermission('EVENT_SPEAKERS_VIEW');
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
      this.hasPermission('INSTITUTIONS_VIEW') ||
      this.hasPermission('COURSE_TABS_VIEW');
  }

  hasCourseTabsShowInMenuPermission(): boolean {
    // Check specific permission first, then fallback to COURSE_TABS_VIEW
    return this.hasPermission('COURSE_TABS_SHOW_IN_MENU') || this.hasPermission('COURSE_TABS_VIEW');
  }

  hasCourseTabsShowPublicPermission(): boolean {
    // Check specific permission first, then fallback to COURSE_TABS_VIEW
    return this.hasPermission('COURSE_TABS_SHOW_PUBLIC') || this.hasPermission('COURSE_TABS_VIEW');
  }

  hasDigitalLibraryViewPermission(): boolean {
    // Check specific permission first, then fallback to DIGITAL_LIBRARY_VIEW
    return this.hasPermission('DIGITAL_LIBRARY_VIEW');
  }

  hasDigitalLibraryManagementViewPermission(): boolean {
    // Check specific permission first, then fallback to DIGITAL_LIBRARY_MANAGEMENT_VIEW
    return this.hasPermission('DIGITAL_LIBRARY_MANAGEMENT_VIEW');
  }

  hasSystemAdministrationItems(): boolean {
    return this.hasPermission('SYSTEM_CONFIG_VIEW') || this.hasPermission('LOGS_VIEW') || this.hasPermission('PUBLIC_CONFIG_VIEW');
  }

  isDepartmentHead(): boolean {
    const currentUser = this.storageService.getItem<any>('currentUser');
    return currentUser?.departmentRole === 'Head';
  }
}
