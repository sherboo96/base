import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { DialogService } from '@ngneat/dialog';
import { LoadingService } from '../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { BehaviorSubject } from 'rxjs';
import { RoleFormComponent } from './role-form/role-form.component';
import { RolePermissionsComponent } from '../role-permissions/role-permissions.component';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './roles.component.html',
})
export class RolesComponent implements OnInit {
  roles: any[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  Math = Math;
  isLoading$ = new BehaviorSubject<boolean>(false);

  constructor(
    private userService: UserService,
    private dialogService: DialogService,
    public loadingService: LoadingService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading$.next(true);
    this.userService.getRoles(this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.roles = response.result;
        this.totalItems = response.total;
        this.isLoading$.next(false);
      },
      error: (error) => {
        this.toastr.error('Failed to load roles');
        this.isLoading$.next(false);
      },
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadRoles();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRoles();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get paginationRange(): number[] {
    const range = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(this.totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  }

  addNewRole(): void {
    const dialogRef = this.dialogService.open(RoleFormComponent, {
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadRoles();
      }
    });
  }

  managePermissions(role: any): void {
    // Navigate to role permissions page with role filter
    this.router.navigate(['/management/rolePermissions'], {
      queryParams: { roleId: role.id, roleName: role.name }
    });
  }
}
