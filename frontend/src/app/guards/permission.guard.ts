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
    const permissions = this.storageService.getItem<string>('userPermissions');

    if (permissions) {
      this.userPermissions = JSON.parse(permissions);
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
