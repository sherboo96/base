import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { StorageService } from '../services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  userPermissions: any[] = [];

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private storageService: StorageService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredPermission = route.data['permission'];
    
    // Check if user has SuperAdmin role
    const userRoles = this.storageService.getItem<any[]>('userRoles');
    const isSuperAdmin = userRoles?.some((role: any) => role.name === 'SuperAdmin');
    
    // SuperAdmin bypasses all permission checks
    if (isSuperAdmin) {
      return true;
    }

    const permissions = this.storageService.getItem<any[]>('userPermissions');

    if (permissions) {
      this.userPermissions = permissions;
    }

    const hasPermission = this.userPermissions.some(
      (p: any) => p.code === requiredPermission
    );

    if (!hasPermission) {
      this.toastr.error(
        'You do not have permission to access this page',
        'Access Denied'
      );
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }
}
