import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  Department,
  DepartmentService,
  DepartmentResponse,
} from '../../../services/department.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../services/loading.service';
import { LoadingComponent } from '../../../components/loading/loading.component';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DialogService } from '@ngneat/dialog';
import { DepartmentFormComponent } from './department-form/department-form.component';
import { DepartmentUploadComponent } from './department-upload/department-upload.component';
import { DepartmentUsersComponent } from './department-users/department-users.component';
import { DepartmentMoveComponent } from './department-move/department-move.component';
import { DepartmentJobTitlesComponent } from './department-job-titles/department-job-titles.component';
import { TranslationService } from '../../../services/translation.service';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';

interface DepartmentTreeNode extends Omit<Department, 'level'> {
  children?: DepartmentTreeNode[];
  level?: number;
  expanded?: boolean;
}

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LoadingComponent,
    DepartmentFormComponent,
  ],
  templateUrl: './department.component.html',
  styleUrl: './department.component.scss',
})
export class DepartmentComponent implements OnInit, OnDestroy {
  departments: Department[] = [];
  departmentTree: DepartmentTreeNode[] = [];
  isLoading = false;
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  searchTerm = '';
  viewMode: 'table' | 'hierarchy' = 'table';
  Math = Math;
  private subscriptions: Subscription[] = [];

  constructor(
    private departmentService: DepartmentService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private dialogService: DialogService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchDepartments();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  fetchDepartments(): void {
    // Don't show loading if already loading to avoid flickering
    if (!this.isLoading) {
      this.isLoading = true;
      this.loadingService.show();
    }

    const sub = this.departmentService
      .getDepartments(this.currentPage, this.pageSize)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response) => {
          this.departments = response.result;
          this.totalItems = response.pagination.total;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('department.fetchError')
          );
        },
      });

    this.subscriptions.push(sub);
  }

  onPageSizeChange(): void {
    this.currentPage = 1; // Reset to first page when changing page size
    this.fetchDepartments();
  }

  getPageNumbers(): number[] {
    const maxVisiblePages = 5;
    const pages: number[] = [];
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.fetchDepartments();
  }

  onSearch(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.fetchDepartments();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive 
      ? this.translationService.instant('common.active') 
      : this.translationService.instant('common.inactive');
  }


  viewDepartmentDetails(department: Department): void {
    this.router.navigate(['/department', department.id]);
  }

  addNewDepartment(): void {
    const dialogRef = this.dialogService.open(DepartmentFormComponent, {
      data: {},
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchDepartments();
        if (this.viewMode === 'hierarchy') {
          setTimeout(() => {
          this.buildDepartmentTree();
          }, 500);
        }
      }
    });
  }

  editDepartment(department: Department): void {
    const dialogRef = this.dialogService.open(DepartmentFormComponent, {
      data: { department },
      width: '800px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.fetchDepartments();
        if (this.viewMode === 'hierarchy') {
          setTimeout(() => {
          this.buildDepartmentTree();
          }, 500);
        }
      }
    });
  }

  uploadDepartments(): void {
    const dialogRef = this.dialogService.open(DepartmentUploadComponent, {
      data: {},
      width: '90vw',
      maxWidth: '900px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        // Reload departments after successful upload
        setTimeout(() => {
          this.fetchDepartments();
          if (this.viewMode === 'hierarchy') {
            this.buildDepartmentTree();
          }
        }, 500);
      }
    });
  }

  deleteDepartment(department: Department): void {
    const dialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
      data: {
        title: this.translationService.instant('department.deleteTitle'),
        message: this.translationService.instant('department.deleteMessage', { name: department.nameEn }),
        confirmText: this.translationService.instant('common.delete'),
        cancelText: this.translationService.instant('common.cancel'),
        type: 'danger',
        warningMessage: this.translationService.instant('department.deleteWarning'),
        showWarning: true,
      },
      width: '500px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
    });

    dialogRef.afterClosed$.subscribe((result) => {
      if (result) {
        this.loadingService.show();
        this.departmentService.deleteDepartment(department.id).subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('department.deleteSuccess'));
            this.loadingService.hide();
            this.fetchDepartments();
            if (this.viewMode === 'hierarchy') {
              setTimeout(() => {
              this.buildDepartmentTree();
              }, 500);
            }
          },
          error: (error) => {
            this.toastr.error(
              error.error?.message || this.translationService.instant('department.deleteError')
            );
            this.loadingService.hide();
          },
        });
      }
    });
  }


  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'hierarchy' : 'table';
    
    if (this.viewMode === 'hierarchy' && this.departmentTree.length === 0) {
      this.buildDepartmentTree();
    }
  }

  buildDepartmentTree(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.loadingService.show();
    this.cdr.detectChanges();

    this.departmentService
      .getAllDepartments()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          try {
            let allDepartments: Department[] = [];
            
            if (Array.isArray(response)) {
              allDepartments = response;
            } else if (response && Array.isArray(response.result)) {
              allDepartments = response.result;
            } else if (response && response.data && Array.isArray(response.data)) {
              allDepartments = response.data;
            } else {
              allDepartments = [];
            }

            const activeDepartments = allDepartments.filter(
              (dept: Department) => dept.isActive !== false && !dept.isDeleted
            );
            
            this.departmentTree = this.buildTree(activeDepartments);
            this.cdr.detectChanges();
          } catch (error) {
            console.error('Error processing departments:', error);
            this.toastr.error(
              this.translationService.instant('department.fetchError')
            );
            this.departmentTree = [];
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error loading departments:', error);
          this.toastr.error(
            error.error?.message || 
            this.translationService.instant('department.fetchError')
          );
          this.departmentTree = [];
          this.cdr.detectChanges();
        },
      });
  }

  private buildTree(departments: Department[]): DepartmentTreeNode[] {
    const departmentMap = new Map<number, DepartmentTreeNode>();
    const roots: DepartmentTreeNode[] = [];

    const activeDepartments = departments.filter((dept) => !dept.isDeleted);

    activeDepartments.forEach((dept) => {
      departmentMap.set(dept.id, {
        ...dept,
        children: [],
        level: 0,
        expanded: true,
      });
    });

    activeDepartments.forEach((dept) => {
      const node = departmentMap.get(dept.id)!;
      if (dept.parentDepartmentId && departmentMap.has(dept.parentDepartmentId)) {
        const parent = departmentMap.get(dept.parentDepartmentId)!;
        node.level = (parent.level || 0) + 1;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      } else if (!dept.parentDepartmentId) {
        roots.push(node);
      }
    });

    const sortChildren = (nodes: DepartmentTreeNode[]): void => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          node.children.sort((a, b) => {
            const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return (a.nameEn || '').localeCompare(b.nameEn || '');
          });
          sortChildren(node.children);
        }
      });
    };

    roots.sort((a, b) => {
      const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.nameEn || '').localeCompare(b.nameEn || '');
    });

    sortChildren(roots);
    return roots;
  }

  getChildrenCount(node: DepartmentTreeNode): number {
    if (!node.children || node.children.length === 0) return 0;
    let count = node.children.length;
    node.children.forEach((child) => {
      count += this.getChildrenCount(child);
    });
    return count;
  }

  toggleNode(node: DepartmentTreeNode): void {
    node.expanded = !node.expanded;
  }

  showUsers(node: DepartmentTreeNode): void {
    const dialogRef = this.dialogService.open(DepartmentUsersComponent, {
      data: {
        departmentId: node.id,
        departmentName: node.nameEn,
      },
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });
  }

  showJobTitles(node: DepartmentTreeNode): void {
    const dialogRef = this.dialogService.open(DepartmentJobTitlesComponent, {
      data: {
        department: node,
      },
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((result) => {
      // No action needed after closing
    });
  }

  get paginationParams() {
    return {
      from: (this.currentPage - 1) * this.pageSize + 1,
      to: Math.min(this.currentPage * this.pageSize, this.totalItems),
      total: this.totalItems
    };
  }

  moveDepartment(department: DepartmentTreeNode): void {
    const dialogRef = this.dialogService.open(DepartmentMoveComponent, {
      data: { department },
      width: '600px',
      enableClose: true,
      closeButton: true,
      resizable: false,
      draggable: true,
      size: 'lg',
    });

    dialogRef.afterClosed$.subscribe((destinationDepartment: any) => {
      if (destinationDepartment) {
        // Get current parent name
        let currentParentName = 'Root Level';
        if (department.parentDepartmentId) {
          const currentParent = this.findNodeById(this.departmentTree, department.parentDepartmentId);
          currentParentName = currentParent?.nameEn || 'Unknown Department';
        }

        // Show confirmation dialog
        const confirmDialogRef = this.dialogService.open(DeleteConfirmationDialogComponent, {
          data: {
            title: this.translationService.instant('department.moveConfirmTitle'),
            message: this.translationService.instant('department.moveConfirmMessage', {
              departmentName: department.nameEn,
              currentParent: currentParentName,
              newParent: (destinationDepartment as any).nameEn || 'Root Level'
            }),
            confirmText: this.translationService.instant('department.move'),
            cancelText: this.translationService.instant('common.cancel'),
            type: 'warning',
            showWarning: true,
            warningMessage: this.translationService.instant('department.moveWarning')
          },
          width: '500px',
          enableClose: true,
          closeButton: true,
          resizable: false,
          draggable: true,
        });

        confirmDialogRef.afterClosed$.subscribe((confirmed) => {
          if (confirmed) {
            const newParentId = (destinationDepartment as any).id || null;
            
            // Prevent moving to itself
            if (newParentId === department.id) {
              this.toastr.warning(this.translationService.instant('department.cannotMoveToSelf'));
              return;
            }

            // Check if parent actually changed
            if (department.parentDepartmentId === newParentId) {
              this.toastr.info(this.translationService.instant('department.parentUnchanged'));
              return;
            }

            // Call API to move department
            this.loadingService.show();
            this.departmentService.moveDepartment(department.id, newParentId, null).subscribe({
              next: (response: any) => {
                const result = response.result || response;
                if (result) {
                  this.toastr.success(this.translationService.instant('department.moveSuccess'));
                  // Rebuild tree to ensure consistency
                  setTimeout(() => {
                    this.buildDepartmentTree();
                  }, 300);
                } else {
                  this.toastr.error(this.translationService.instant('department.moveError'));
                }
                this.loadingService.hide();
              },
              error: (error) => {
                console.error('Error moving department:', error);
                this.toastr.error(
                  error.error?.message || this.translationService.instant('department.moveError')
                );
                this.loadingService.hide();
              },
            });
          }
        });
      }
    });
  }

  private findNodeById(nodes: DepartmentTreeNode[], id: number): DepartmentTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = this.findNodeById(node.children, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

}

