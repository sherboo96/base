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
import { UserComponent } from './pages/management/user/user.component';
import { PermissionsComponent } from './pages/management/permissions/permissions.component';
import { RolesComponent } from './pages/management/roles/roles.component';
import { RolePermissionsComponent } from './pages/management/role-permissions/role-permissions.component';
import { PermissionGuard } from './guards/permission.guard';
import { ProfileComponent } from './pages/profile/profile.component';
import { UserRolesComponent } from './pages/management/user-roles/user-roles.component';

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
    canActivate: [AuthGuard],
    data: { redirectIfLoggedIn: false }, // Allow logged-in users to access dashboard
  },

  {
    path: 'management/organization',
    component: OrganizationComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'UMS0000',
    },
  },
  {
    path: 'management/department',
    component: DepartmentComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'UMS0001',
    },
  },
  {
    path: 'management/positions',
    component: PositionComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'UMS0010',
    },
  },
  {
    path: 'management/users',
    component: UserComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'UMS0011',
    },
  },
  {
    path: 'management/permissions',
    component: PermissionsComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'UMS0100',
    },
  },
  {
    path: 'management/rolePermissions',
    component: RolePermissionsComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'UMS1001',
    },
  },
  {
    path: 'management/roles',
    component: RolesComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'UMS0101',
    },
  },
  {
    path: 'management/userRoles',
    component: UserRolesComponent,
    canActivate: [AuthGuard, PermissionGuard],
    data: {
      redirectIfLoggedIn: false,
      permission: 'UMS0111',
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
