import { Component, OnInit, ChangeDetectorRef, AfterViewChecked, ViewChild, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-role-permissions-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './role-permissions-manager.component.html',
  styles: [`
    :host {
      display: block;
      max-height: 90vh;
      overflow: hidden;
    }
    
    .permissions-scroll-container {
      max-height: 60vh;
      overflow-y: auto;
    }
    
    .permissions-scroll-container::-webkit-scrollbar {
      width: 8px;
    }
    
    .permissions-scroll-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .permissions-scroll-container::-webkit-scrollbar-thumb {
      background: #c9ae81;
      border-radius: 10px;
    }
    
    .permissions-scroll-container::-webkit-scrollbar-thumb:hover {
      background: #b89a6e;
    }
  `]
})
export class RolePermissionsManagerComponent implements OnInit, AfterViewChecked {
  role: any;
  allPermissions: any[] = [];
  rolePermissions: any[] = [];
  selectedPermissions: Set<number> = new Set();
  searchTerm: string = '';
  isLoading = false;
  @ViewChildren('categoryCheckbox') categoryCheckboxes!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private userService: UserService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ role: any }>,
    private cdr: ChangeDetectorRef
  ) {
    this.role = this.dialogRef.data?.role;
  }

  ngOnInit(): void {
    if (this.role) {
      this.loadPermissions();
      this.loadRolePermissions();
    }
  }

  ngAfterViewChecked(): void {
    // Update indeterminate states when view is checked
    this.updateIndeterminateStates();
  }

  loadPermissions(): void {
    this.isLoading = true;
    this.userService.getPermissions(1, 1000).subscribe({
      next: (response) => {
        this.allPermissions = response.result || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load permissions:', error);
        this.toastr.error('Failed to load permissions');
        this.isLoading = false;
      },
    });
  }

  loadRolePermissions(): void {
    this.isLoading = true;
    this.userService.getRolePermissions(1, 1000).subscribe({
      next: (response) => {
        // Filter permissions for this role
        this.rolePermissions = (response.result || []).filter(
          (rp: any) => rp.roleId === this.role.id
        );
        // Populate selected permissions set
        this.selectedPermissions = new Set(
          this.rolePermissions.map((rp: any) => rp.permissionId)
        );
        this.isLoading = false;
        this.cdr.detectChanges();
        // Update indeterminate states after data is loaded
        setTimeout(() => this.updateIndeterminateStates(), 0);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load role permissions:', error);
        this.toastr.error('Failed to load role permissions');
        this.isLoading = false;
      },
    });
  }

  get filteredPermissions(): any[] {
    if (!this.searchTerm) {
      return this.allPermissions;
    }
    const term = this.searchTerm.toLowerCase();
    return this.allPermissions.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(term) ||
        p.code?.toLowerCase().includes(term)
    );
  }

  get permissionsByCategory(): { category: string; permissions: any[] }[] {
    const filtered = this.filteredPermissions;
    const categoryMap = new Map<string, any[]>();

    filtered.forEach((permission: any) => {
      // Extract category from code (e.g., "USERS_VIEW" -> "Users")
      const category = this.getCategoryFromCode(permission.code);
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(permission);
    });

    // Convert to array and sort by category name
    return Array.from(categoryMap.entries())
      .map(([category, permissions]) => ({
        category,
        permissions: permissions.sort((a, b) => a.name.localeCompare(b.name))
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  getCategoryFromCode(code: string): string {
    if (!code) return 'Other';
    
    // Handle special cases first (multi-word prefixes)
    if (code.startsWith('ROLE_PERMISSIONS_')) {
      return 'Role Permissions';
    }
    if (code.startsWith('USER_ROLES_')) {
      return 'User Roles';
    }
    if (code.startsWith('JOB_TITLES_')) {
      return 'Job Titles';
    }
    
    // Extract prefix before first underscore
    const prefix = code.split('_')[0];
    
    // Map common prefixes to readable category names
    const categoryMap: { [key: string]: string } = {
      'USERS': 'Users',
      'USER': 'Users',
      'ROLES': 'Roles',
      'ROLE': 'Roles',
      'PERMISSIONS': 'Permissions',
      'PERMISSION': 'Permissions',
      'ORGANIZATIONS': 'Organizations',
      'ORGANIZATION': 'Organizations',
      'DEPARTMENTS': 'Departments',
      'DEPARTMENT': 'Departments',
      'LOCATIONS': 'Locations',
      'LOCATION': 'Locations',
      'POSITIONS': 'Positions',
      'POSITION': 'Positions',
      'INSTRUCTORS': 'Instructors',
      'INSTRUCTOR': 'Instructors',
      'DASHBOARD': 'Dashboard',
      'SYSTEM': 'System',
      'TRAINING': 'Training',
      'COURSES': 'Courses',
      'COURSE': 'Courses'
    };

    // Return mapped category or format prefix nicely
    return categoryMap[prefix] || prefix.charAt(0) + prefix.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  getCategorySelectedCount(category: string): number {
    const categoryPermissions = this.permissionsByCategory.find(c => c.category === category);
    if (!categoryPermissions) return 0;
    
    return categoryPermissions.permissions.filter((p: any) => 
      this.selectedPermissions.has(p.id)
    ).length;
  }

  toggleCategory(category: string, selectAll: boolean): void {
    const categoryPermissions = this.permissionsByCategory.find(c => c.category === category);
    if (!categoryPermissions) return;

    categoryPermissions.permissions.forEach((permission: any) => {
      if (selectAll) {
        this.selectedPermissions.add(permission.id);
      } else {
        this.selectedPermissions.delete(permission.id);
      }
    });
    this.cdr.detectChanges();
    // Update indeterminate states after change detection
    setTimeout(() => this.updateIndeterminateStates(), 0);
  }

  isCategoryFullySelected(category: string): boolean {
    const categoryPermissions = this.permissionsByCategory.find(c => c.category === category);
    if (!categoryPermissions || categoryPermissions.permissions.length === 0) return false;
    
    return categoryPermissions.permissions.every((p: any) => 
      this.selectedPermissions.has(p.id)
    );
  }

  isCategoryPartiallySelected(category: string): boolean {
    const categoryPermissions = this.permissionsByCategory.find(c => c.category === category);
    if (!categoryPermissions || categoryPermissions.permissions.length === 0) return false;
    
    const selectedCount = categoryPermissions.permissions.filter((p: any) => 
      this.selectedPermissions.has(p.id)
    ).length;
    
    return selectedCount > 0 && selectedCount < categoryPermissions.permissions.length;
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.selectedPermissions.has(permissionId);
  }

  togglePermission(permissionId: number): void {
    if (this.selectedPermissions.has(permissionId)) {
      this.selectedPermissions.delete(permissionId);
    } else {
      this.selectedPermissions.add(permissionId);
    }
    this.cdr.detectChanges();
    // Update indeterminate states after change detection
    setTimeout(() => this.updateIndeterminateStates(), 0);
  }

  updateIndeterminateStates(): void {
    this.categoryCheckboxes?.forEach((checkbox, index) => {
      const categoryGroup = this.permissionsByCategory[index];
      if (categoryGroup && checkbox.nativeElement) {
        checkbox.nativeElement.indeterminate = this.isCategoryPartiallySelected(categoryGroup.category);
      }
    });
  }

  onSave(): void {
    this.isLoading = true;
    
    // Get current permission IDs
    const currentPermissionIds = new Set(
      this.rolePermissions.map((rp: any) => rp.permissionId)
    );
    
    // Get selected permission IDs
    const selectedPermissionIds = new Set(this.selectedPermissions);
    
    // Find permissions to add
    const toAdd = Array.from(selectedPermissionIds).filter(
      (id) => !currentPermissionIds.has(id)
    );
    
    // Find permissions to remove
    const toRemove = Array.from(currentPermissionIds).filter(
      (id) => !selectedPermissionIds.has(id)
    );
    
    // Create promises for all operations
    const operations: Promise<any>[] = [];
    
    // Add new permissions
    toAdd.forEach((permissionId) => {
      operations.push(
        firstValueFrom(
          this.userService.createRolePermission({
            roleId: this.role.id,
            permissionId: permissionId,
          })
        ).then(() => true).catch((error) => {
          console.error('Failed to add permission:', error);
          return null;
        })
      );
    });
    
    // Remove permissions
    toRemove.forEach((permissionId) => {
      operations.push(
        firstValueFrom(
          this.userService.deleteRolePermission(this.role.id, permissionId)
        ).then(() => true).catch((error) => {
          console.error('Failed to remove permission:', error);
          return null;
        })
      );
    });
    
        // Execute all operations
    Promise.all(operations)
      .then((results) => {
        const failed = results.filter((r) => r === null).length;
        if (failed === 0) {
          this.toastr.success('Permissions updated successfully');
          this.dialogRef.close(true);
        } else {
          this.toastr.warning(
            `Updated permissions with ${failed} errors. Please refresh to verify.`
          );
          this.dialogRef.close(true);
        }
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Error updating permissions:', error);
        this.toastr.error('Failed to update permissions');
        this.isLoading = false;
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
