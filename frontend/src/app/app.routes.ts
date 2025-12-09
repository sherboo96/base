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
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'DASHBOARD_VIEW',
    },
  },

  {
    path: 'management/organization',
    component: OrganizationComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'ORGANIZATIONS_VIEW',
    },
  },
  {
    path: 'management/department',
    component: DepartmentComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'DEPARTMENTS_VIEW',
    },
  },
  {
    path: 'management/segment',
    component: SegmentComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'SEGMENTS_VIEW',
    },
  },
  {
    path: 'management/positions',
    component: PositionComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'JOB_TITLES_VIEW',
    },
  },
  {
    path: 'management/job-titles',
    component: JobTitleComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'JOB_TITLES_VIEW',
    },
  },
  {
    path: 'management/location',
    component: LocationComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'LOCATIONS_VIEW',
    },
  },
  {
    path: 'management/instructor',
    component: InstructorComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'INSTRUCTORS_VIEW',
    },
  },
  {
    path: 'management/institution',
    component: InstitutionComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'INSTITUTIONS_VIEW',
    },
  },
  {
    path: 'management/users',
    component: UserComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'USERS_VIEW',
    },
  },
  {
    path: 'management/permissions',
    component: PermissionsComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'PERMISSIONS_VIEW',
    },
  },
  {
    path: 'management/rolePermissions',
    component: RolePermissionsComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'ROLE_PERMISSIONS_VIEW',
    },
  },
  {
    path: 'management/roles',
    component: RolesComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'ROLES_VIEW',
    },
  },
  {
    path: 'management/userRoles',
    component: UserRolesComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'USER_ROLES_VIEW',
    },
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard],
    data: {
      redirectIfLoggedIn: false,
    },
  },
  {
    path: '**',
    redirectTo: 'login', // Redirect undefined routes to login
  },
];
