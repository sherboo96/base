import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
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
import { TranslationService } from '../../../services/translation.service';
import { DeleteConfirmationDialogComponent } from '../../../components/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    DragDropModule,
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
  viewMode: 'table' | 'tree' = 'table';
  Math = Math;
  private subscriptions: Subscription[] = [];
  cachedDropListIds: string[] = [];

  constructor(
    private departmentService: DepartmentService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private router: Router,
    private dialogService: DialogService,
    private translationService: TranslationService
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
          // Only build tree if in tree view mode, tree is empty, and not already loading
          if (this.viewMode === 'tree' && this.departmentTree.length === 0 && !this.isLoading) {
            // Use setTimeout to avoid calling during the same change detection cycle
            setTimeout(() => {
              if (this.viewMode === 'tree' && this.departmentTree.length === 0 && !this.isLoading) {
                this.buildDepartmentTree();
              }
            }, 0);
          }
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
        if (this.viewMode === 'tree') {
          this.buildDepartmentTree();
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
        if (this.viewMode === 'tree') {
          this.buildDepartmentTree();
        }
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
            if (this.viewMode === 'tree') {
              this.buildDepartmentTree();
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
    const newMode = this.viewMode === 'table' ? 'tree' : 'table';
    if (newMode === this.viewMode) return; // Already in this mode
    
    this.viewMode = newMode;
    
    // Only build tree if switching to tree view and tree is empty
    // Don't rebuild if already loading or if tree already exists
    if (this.viewMode === 'tree' && this.departmentTree.length === 0 && !this.isLoading) {
      this.buildDepartmentTree();
    }
  }

  buildDepartmentTree(): void {
    // Prevent multiple simultaneous builds
    if (this.isLoading) {
      console.log('Already loading, skipping tree build');
      return;
    }

    this.isLoading = true;
    this.loadingService.show();
    
    console.log('Building department tree...');
    
    // Fetch all departments for tree view
    const sub = this.departmentService.getAllDepartments()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (response: any) => {
          const allDepartments = response.result || [];
          console.log('Fetched departments for tree:', allDepartments.length);
          this.departmentTree = this.buildTree(allDepartments);
          console.log('Built tree with', this.departmentTree.length, 'root nodes');
          // Cache drop list IDs for better performance
          this.cachedDropListIds = this.getAllDropListIds();
          console.log('Tree build complete');
        },
        error: (error) => {
          console.error('Error loading departments for tree:', error);
          this.departmentTree = [];
          this.cachedDropListIds = [];
          this.toastr.error(
            error.error?.message || this.translationService.instant('department.fetchError')
          );
        },
      });
    
    this.subscriptions.push(sub);
  }

  private buildTree(departments: Department[]): DepartmentTreeNode[] {
    const departmentMap = new Map<number, DepartmentTreeNode>();
    const roots: DepartmentTreeNode[] = [];

    // First pass: create all nodes
    departments.forEach((dept) => {
      departmentMap.set(dept.id, {
        ...dept,
        children: [],
        level: 0,
      });
    });

    // Second pass: build tree structure
    departments.forEach((dept) => {
      const node = departmentMap.get(dept.id)!;
      if (dept.parentDepartmentId && departmentMap.has(dept.parentDepartmentId)) {
        const parent = departmentMap.get(dept.parentDepartmentId)!;
        node.level = (parent.level || 0) + 1;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      } else {
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

  onDragDrop(event: CdkDragDrop<DepartmentTreeNode[]>): void {
    console.log('=== DRAG DROP EVENT ===');
    console.log('Event:', event);
    console.log('Event container:', event.container);
    console.log('Event previousContainer:', event.previousContainer);
    console.log('Event container ID:', event.container?.id);
    console.log('Event previousContainer ID:', event.previousContainer?.id);
    console.log('Event container data:', event.container?.data);
    console.log('Event previousContainer data:', event.previousContainer?.data);
    console.log('Event previousIndex:', event.previousIndex);
    console.log('Event currentIndex:', event.currentIndex);
    
    if (!event.container || !event.previousContainer) {
      console.error('Missing container or previousContainer');
      return;
    }

    // Get the dragged node - try multiple ways to ensure we get it
    let draggedNode: DepartmentTreeNode | undefined = undefined;
    
    // Method 1: From previousContainer data array
    if (event.previousContainer.data && Array.isArray(event.previousContainer.data)) {
      draggedNode = event.previousContainer.data[event.previousIndex];
    }
    
    // Method 2: From cdkDragData if available
    if (!draggedNode && (event as any).item?.data) {
      draggedNode = (event as any).item.data;
    }
    
    if (!draggedNode) {
      console.error('No dragged node found. Event data:', event);
      this.toastr.error('Could not identify the department being moved. Please try again.');
      return;
    }
    
    console.log('Dragged node:', draggedNode.nameEn, 'ID:', draggedNode.id);
    console.log('Container ID:', event.container.id);
    console.log('Previous container ID:', event.previousContainer.id);
    console.log('Container data length:', event.container.data?.length);
    console.log('Previous container data length:', event.previousContainer.data?.length);
    
    // Determine the new parent ID from the drop container - simplified logic
    let newParentId: number | null = null;
    const containerId = event.container.id;
    
    console.log('Container ID:', containerId);
    
    if (!containerId) {
      console.error('Container ID is missing. Event:', event);
      this.toastr.error('Could not identify drop target. Please try again.');
      this.cachedDropListIds = [];
      this.buildDepartmentTree();
      return;
    }
    
    if (containerId === 'root-drop-list') {
      // Dropped at root level
      newParentId = null;
      console.log('✓ Dropped at root level');
    } else {
      // Extract parent ID from container ID (format: "drop-list-{id}")
      const match = containerId.match(/^drop-list-(\d+)$/);
      if (match) {
        newParentId = parseInt(match[1], 10);
        console.log('✓ New parent ID extracted:', newParentId);
        
        // Validate that the parent ID is not the same as the dragged node
        if (newParentId === draggedNode.id) {
          console.error('✗ Cannot move department to itself');
          this.toastr.error('Cannot move a department to be a child of itself.');
          this.cachedDropListIds = [];
          this.buildDepartmentTree();
          return;
        }
      } else {
        console.error('✗ Could not extract parent ID from container ID:', containerId);
        this.toastr.error('Invalid drop target. Please try again.');
        this.cachedDropListIds = [];
        this.buildDepartmentTree();
        return;
      }
    }
    
    console.log('✓ Final newParentId:', newParentId);

    // Prevent moving a department to be a child of itself or its descendants
    if (this.wouldCreateCircularReference(draggedNode, newParentId)) {
      console.log('Circular reference detected');
      this.toastr.error(
        this.translationService.instant('department.moveCircularError')
      );
      // Rebuild tree to reset UI without showing loading
      this.cachedDropListIds = [];
      this.buildDepartmentTree();
      return;
    }

    // Handle reordering within the same container
    if (event.previousContainer === event.container) {
      console.log('Reordering within same container');
      const newOrderIndex = event.currentIndex;
      
      // Update UI optimistically
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      
      // Call API to save the new order
      const wasLoading = this.isLoading;
      if (!wasLoading) {
        this.loadingService.show();
      }
      
      const sub = this.departmentService.moveDepartment(
        draggedNode.id,
        newParentId,
        newOrderIndex
      )
        .pipe(
          finalize(() => {
            if (!wasLoading) {
              this.loadingService.hide();
            }
          })
        )
        .subscribe({
        next: (result) => {
          console.log('✓ Order update successful, response:', result);
          this.toastr.success(
            this.translationService.instant('department.moveSuccess')
          );
          // Reload tree to reflect changes
          this.cachedDropListIds = [];
          console.log('Rebuilding tree after order update...');
          this.buildDepartmentTree();
        },
        error: (error) => {
          console.error('✗ Order update error:', error);
          
          let errorMessage = this.translationService.instant('department.moveError');
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.toastr.error(errorMessage);
          // Rebuild tree to reset UI state
          this.cachedDropListIds = [];
          console.log('Rebuilding tree after error...');
          this.buildDepartmentTree();
        },
        });
      
      this.subscriptions.push(sub);
      return;
    }

    // Handle moving to a different container
    console.log('Moving to different container, calling API...');
    console.log('Dragged node ID:', draggedNode.id);
    console.log('New parent ID:', newParentId);
    console.log('New order index:', event.currentIndex);
    
    // Don't update UI optimistically - wait for API confirmation
    // This prevents UI inconsistencies if the API call fails
    
    // Determine the new order index based on drop position
    const newOrderIndex = event.currentIndex;

    // Update the parent and order in the backend
    const wasLoading = this.isLoading;
    if (!wasLoading) {
      this.loadingService.show();
    }
    
    console.log('Calling moveDepartment API with:', {
      id: draggedNode.id,
      newParentId: newParentId,
      newOrderIndex: newOrderIndex
    });
    
    const sub = this.departmentService.moveDepartment(draggedNode.id, newParentId, newOrderIndex)
      .pipe(
        finalize(() => {
          if (!wasLoading) {
            this.loadingService.hide();
          }
        })
      )
      .subscribe({
        next: () => {
          console.log('Move successful');
          this.toastr.success(
            this.translationService.instant('department.moveSuccess')
          );
          // Clear cache and rebuild tree to reflect changes
          this.cachedDropListIds = [];
          this.buildDepartmentTree();
        },
        error: (error) => {
          console.error('Move error:', error);
          this.toastr.error(
            error.error?.message || this.translationService.instant('department.moveError')
          );
          // Clear cache and rebuild tree to reset UI on error
          this.cachedDropListIds = [];
          this.buildDepartmentTree();
        },
      });
    
    this.subscriptions.push(sub);
  }

  private wouldCreateCircularReference(node: DepartmentTreeNode, newParentId: number | null): boolean {
    if (!newParentId) return false; // Moving to root is always safe
    
    // Check if newParentId is the node itself
    if (newParentId === node.id) return true;
    
    // Check if newParentId is any descendant of the node
    const checkDescendants = (currentNode: DepartmentTreeNode): boolean => {
      if (currentNode.id === newParentId) return true;
      if (currentNode.children) {
        return currentNode.children.some(child => checkDescendants(child));
      }
      return false;
    };
    
    return checkDescendants(node);
  }

  getAllDropListIds(): string[] {
    if (this.cachedDropListIds.length > 0) {
      return this.cachedDropListIds;
    }
    
    const lists: string[] = ['root-drop-list'];
    
    const addAllIds = (nodes: DepartmentTreeNode[]) => {
      nodes.forEach(n => {
        // Each card has a drop zone for its children
        lists.push(`drop-list-${n.id}`);
        if (n.children && n.children.length > 0) {
          addAllIds(n.children);
        }
      });
    };
    
    addAllIds(this.departmentTree);
    this.cachedDropListIds = lists;
    console.log('All drop list IDs:', lists);
    return lists;
  }

  getConnectedDropLists(node?: DepartmentTreeNode): string[] {
    const allLists = this.getAllDropListIds();
    
    // If a node is provided (the card being dragged), exclude its own children drop list and descendant drop lists
    if (node) {
      const excludeIds: number[] = [node.id];
      
      const addDescendantIds = (n: DepartmentTreeNode) => {
        if (n.children && n.children.length > 0) {
          n.children.forEach(child => {
            excludeIds.push(child.id);
            addDescendantIds(child);
          });
        }
      };
      
      addDescendantIds(node);
      
      const connectedLists = allLists.filter(id => {
        const match = id.match(/^drop-list-(\d+)$/);
        if (match) {
          const nodeId = parseInt(match[1], 10);
          return !excludeIds.includes(nodeId);
        }
        return true; // Keep root-drop-list
      });
      
      console.log('Connected drop lists for node', node.nameEn, ':', connectedLists);
      return connectedLists;
    }
    
    return allLists;
  }

  trackByNodeId(index: number, node: DepartmentTreeNode): number {
    return node.id;
  }

  getEmptyChildrenArray(): DepartmentTreeNode[] {
    return [];
  }
}

interface DepartmentTreeNode extends Omit<Department, 'level'> {
  children?: DepartmentTreeNode[];
  level?: number;
}
