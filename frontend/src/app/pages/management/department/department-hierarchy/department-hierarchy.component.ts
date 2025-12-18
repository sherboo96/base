import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogRef, DialogService } from '@ngneat/dialog';
import { Department, DepartmentService } from '../../../../services/department.service';
import { LoadingService } from '../../../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslationService } from '../../../../services/translation.service';
import { DepartmentUsersComponent } from '../department-users/department-users.component';
import { finalize } from 'rxjs/operators';

interface DepartmentTreeNode extends Omit<Department, 'level'> {
  children?: DepartmentTreeNode[];
  level?: number;
  expanded?: boolean; // For expand/collapse functionality
}

@Component({
  selector: 'app-department-hierarchy',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './department-hierarchy.component.html',
  styleUrls: ['./department-hierarchy.component.scss'],
})
export class DepartmentHierarchyComponent implements OnInit {
  departmentTree: DepartmentTreeNode[] = [];
  isLoading = false;

  constructor(
    public dialogRef: DialogRef,
    private departmentService: DepartmentService,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
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
            // Handle different response formats
            let allDepartments: Department[] = [];
            
            if (Array.isArray(response)) {
              // Response is directly an array
              allDepartments = response;
            } else if (response && Array.isArray(response.result)) {
              // Response has a result property with array
              allDepartments = response.result;
            } else if (response && response.data && Array.isArray(response.data)) {
              // Response has a data property with array
              allDepartments = response.data;
            } else {
              console.warn('Unexpected response format:', response);
              allDepartments = [];
            }

            // Filter to only show active, non-deleted departments
            const activeDepartments = allDepartments.filter(
              (dept: Department) => dept.isActive !== false && !dept.isDeleted
            );
            
            // Build tree - only root departments (no parent) will be at top level
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

    // Filter out deleted departments
    const activeDepartments = departments.filter((dept) => !dept.isDeleted);

    // First pass: create all nodes
    activeDepartments.forEach((dept) => {
      departmentMap.set(dept.id, {
        ...dept,
        children: [],
        level: 0,
        expanded: true, // Default to expanded
      });
    });

    // Second pass: build tree structure - only departments without parents are roots
    activeDepartments.forEach((dept) => {
      const node = departmentMap.get(dept.id)!;
      // If department has a parent and parent exists in the map, add it as a child
      if (dept.parentDepartmentId && departmentMap.has(dept.parentDepartmentId)) {
        const parent = departmentMap.get(dept.parentDepartmentId)!;
        node.level = (parent.level || 0) + 1;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      } else if (!dept.parentDepartmentId) {
        // Only add to roots if it has NO parent (null, undefined, or 0)
        roots.push(node);
      }
    });

    // Third pass: sort children by OrderIndex
    const sortChildren = (nodes: DepartmentTreeNode[]): void => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          // Sort children by OrderIndex (nulls last), then by name
          node.children.sort((a, b) => {
            const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return (a.nameEn || '').localeCompare(b.nameEn || '');
          });
          // Recursively sort children
          sortChildren(node.children);
        }
      });
    };

    // Sort roots by OrderIndex
    roots.sort((a, b) => {
      const orderA = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.nameEn || '').localeCompare(b.nameEn || '');
    });

    // Sort all children recursively
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

    dialogRef.afterClosed$.subscribe((result) => {
      // No action needed after closing
    });
  }
}

