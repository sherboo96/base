import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AuthGuard } from './services/auth.guard';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';
import { RequestComponent } from './pages/request/request.component';
import { RequestDetailsComponent } from './pages/request/request-details/request-details.component';
import { OrganizationComponent } from './pages/management/organization/organization.component';
import { DepartmentComponent } from './pages/management/department/department.component';
import { PositionComponent } from './pages/management/position/position.component';
import { JobTitleComponent } from './pages/management/job-title/job-title.component';
import { UserComponent } from './pages/management/user/user.component';
import { PermissionsComponent } from './pages/management/permissions/permissions.component';
import { RolesComponent } from './pages/management/roles/roles.component';
import { RolePermissionsComponent } from './pages/management/role-permissions/role-permissions.component';
import { PermissionGuard } from './guards/permission.guard';
import { ProfileComponent } from './pages/profile/profile.component';
import { UserRolesComponent } from './pages/management/user-roles/user-roles.component';
import { LocationComponent } from './pages/management/location/location.component';
import { InstructorComponent } from './pages/management/instructor/instructor.component';
import { InstitutionComponent } from './pages/management/institution/institution.component';
import { SegmentComponent } from './pages/management/segment/segment.component';
import { SystemConfigurationComponent } from './pages/management/system-configuration/system-configuration.component';
import { PublicComponent } from './pages/management/public/public.component';
import { AdoptionUserComponent } from './pages/management/adoption-user/adoption-user.component';
import { CourseTabComponent } from './pages/management/course-tab/course-tab.component';
import { LogsComponent } from './pages/management/logs/logs.component';
import { CourseDetailComponent } from './pages/courses/course-detail/course-detail.component';
import { ProfileCompletionComponent } from './pages/profile-completion/profile-completion.component';
import { ProfileCompletionGuard } from './guards/profile-completion.guard';
import { CourseComponent } from './pages/management/course/course.component';
import { CourseDetailsComponent } from './pages/management/course/course-details/course-details.component';
import { CoursePreviewComponent } from './pages/courses/course-preview/course-preview.component';
import { EventRegistrationComponent } from './pages/events/event-registration/event-registration.component';
import { SessionEnrollmentComponent } from './pages/events/session-enrollment/session-enrollment.component';
import { EventComponent } from './pages/management/event/event.component';
import { EventOrganizationComponent } from './pages/management/event-organization/event-organization.component';
import { EventSpeakerComponent } from './pages/management/event-speaker/event-speaker.component';
import { EventSessionComponent } from './pages/management/event-session/event-session.component';
import { DigitalLibraryComponent } from './pages/digital-library/digital-library.component';
import { DigitalLibraryManagementComponent } from './pages/management/digital-library/digital-library-management.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login', // Redirect to login as the default
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [AuthGuard],
    data: { redirectIfLoggedIn: true }, // Prevent logged-in users from accessing login
  },
  { path: 'unauthorized', component: UnauthorizedComponent }, // Unauthorized screen
  {
    path: 'events/:code',
    component: EventRegistrationComponent,
    data: { hideNavigation: true }, // Hide side-menu and navbar for public routes
    // No AuthGuard - public route
  },
  {
    path: 'events/massar/:sessionId',
    component: SessionEnrollmentComponent,
    data: { hideNavigation: true }, // Hide side-menu and navbar for public routes
    // No AuthGuard - public route
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: { permission: 'DASHBOARD_VIEW' },
  },
  {
    path: 'user-dashboard',
    loadComponent: () =>
      import('./pages/user-dashboard/user-dashboard.component').then(
        (m) => m.UserDashboardComponent
      ),
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'USER_DASHBOARD_VIEW' }, // Requires USER_DASHBOARD_VIEW permission
  },
  {
    path: 'requests',
    component: RequestComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard],
    data: {
      redirectIfLoggedIn: false,
    },
  },

  {
    path: 'management/organization',
    component: OrganizationComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'ORGANIZATIONS_VIEW',
    },
  },
  {
    path: 'management/department',
    component: DepartmentComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'DEPARTMENTS_VIEW',
    },
  },
  {
    path: 'management/segment',
    component: SegmentComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'SEGMENTS_VIEW',
    },
  },
  {
    path: 'management/positions',
    component: PositionComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'JOB_TITLES_VIEW',
    },
  },
  {
    path: 'management/job-titles',
    component: JobTitleComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'JOB_TITLES_VIEW',
    },
  },
  {
    path: 'management/location',
    component: LocationComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'LOCATIONS_VIEW',
    },
  },
  {
    path: 'management/instructor',
    component: InstructorComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'INSTRUCTORS_VIEW',
    },
  },
  {
    path: 'management/institution',
    component: InstitutionComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'INSTITUTIONS_VIEW',
    },
  },
  {
    path: 'management/users',
    component: UserComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'USERS_VIEW',
    },
  },
  {
    path: 'management/permissions',
    component: PermissionsComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'PERMISSIONS_VIEW',
    },
  },
  {
    path: 'management/rolePermissions',
    component: RolePermissionsComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'ROLE_PERMISSIONS_VIEW',
    },
  },
  {
    path: 'management/roles',
    component: RolesComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'ROLES_VIEW',
    },
  },
  {
    path: 'management/userRoles',
    component: UserRolesComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'USER_ROLES_VIEW',
    },
  },
  {
    path: 'management/system-configuration',
    component: SystemConfigurationComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'SYSTEM_CONFIG_VIEW',
    },
  },
  {
    path: 'management/public',
    component: PublicComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'PUBLIC_CONFIG_VIEW',
    },
  },
  {
    path: 'management/logs',
    component: LogsComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'LOGS_VIEW',
    },
  },
  {
    path: 'management/adoption-user',
    component: AdoptionUserComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'ADOPTION_USERS_VIEW',
    },
  },
  {
    path: 'management/events',
    component: EventComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'EVENTS_VIEW',
    },
  },
  {
    path: 'management/event-sessions',
    component: EventSessionComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'EVENTS_VIEW',
    },
  },
  {
    path: 'management/event-organizations',
    component: EventOrganizationComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'EVENT_ORGANIZATIONS_VIEW',
    },
  },
  {
    path: 'management/event-speakers',
    component: EventSpeakerComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'EVENT_SPEAKERS_VIEW',
    },
  },
  {
    path: 'management/course-tab',
    component: CourseTabComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'COURSE_TABS_VIEW',
    },
  },
  {
    path: 'management/course-tab-approvals',
    loadComponent: () => import('./pages/management/course-tab-approval/course-tab-approval.component').then(m => m.CourseTabApprovalComponent),
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'COURSE_TAB_APPROVALS_VIEW',
    },
  },
  {
    path: 'management/courses',
    component: CourseComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'COURSE_TABS_VIEW',
    },
  },
  {
    path: 'management/courses',
    component: CourseComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'COURSE_TABS_VIEW',
    },
  },
  {
    path: 'management/courses/:courseTabId',
    component: CourseComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'COURSE_TABS_VIEW',
    },
  },
  {
    path: 'management/courses/details/:id',
    component: CourseDetailsComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'COURSE_TABS_VIEW',
    },
  },
  {
    path: 'courses/:routeCode',
    component: CourseComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard],
    data: {
      redirectIfLoggedIn: false,
    },
  },
  {
    path: 'courses/:routeCode/preview/:id',
    component: CoursePreviewComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard],
    data: {
      redirectIfLoggedIn: false,
    },
  },
  {
    path: 'management/courses/:routeCode',
    component: CourseDetailComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard],
    data: {
      redirectIfLoggedIn: false,
    },
  },
  {
    path: 'digital-library/:routeCode',
    component: DigitalLibraryComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      permission: 'DIGITAL_LIBRARY_VIEW',
      redirectIfLoggedIn: false
    }
  },
  {
    path: 'management/digital-library/:routeCode',
    component: DigitalLibraryManagementComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard, PermissionGuard],
    data: {
      permission: 'DIGITAL_LIBRARY_MANAGEMENT_VIEW',
      redirectIfLoggedIn: false
    }
  },
  {
    path: 'profile-completion',
    component: ProfileCompletionComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard],
    data: {
      redirectIfLoggedIn: false,
    },
    // Note: ProfileCompletionGuard is NOT added here to allow access to this page
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard, ProfileCompletionGuard],
    data: {
      redirectIfLoggedIn: false,
    },
  },
  {
    path: '**',
    redirectTo: 'login', // Redirect undefined routes to login
  },
];
