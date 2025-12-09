import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { SegmentService } from '../../../../services/segment.service';
import { OrganizationService } from '../../../../services/organization.service';
import { UserService } from '../../../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-segment-form',
  templateUrl: './segment-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class SegmentFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  isAssignUsersMode = false;
  organizations: any[] = [];
  users: any[] = [];
  filteredUsers: any[] = [];
  selectedUserIds: string[] = [];
  isLoadingOrganizations = false;
  isLoadingUsers = false;

  constructor(
    private fb: FormBuilder,
    private segmentService: SegmentService,
    private organizationService: OrganizationService,
    private userService: UserService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ segment?: any; assignUsersMode?: boolean }>,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nameAr: ['', Validators.required],
      code: ['', Validators.required],
      organizationId: ['', Validators.required],
      isActive: [true],
    });

    if (this.dialogRef.data?.segment) {
      const segment = this.dialogRef.data.segment;
      
      // Check if this is "assign users" mode
      this.isAssignUsersMode = this.dialogRef.data?.assignUsersMode === true;
      this.isEdit = !this.isAssignUsersMode;
      
      this.form.patchValue({
        name: segment.name || '',
        nameAr: segment.nameAr || '',
        code: segment.code || '',
        organizationId: segment.organizationId || '',
        isActive: segment.isActive !== false,
      });
      this.selectedUserIds = segment.userIds || [];
      
      // Store organizationId separately for assign users mode
      // In assign users mode, disable all fields except user selection
      if (this.isAssignUsersMode) {
        this.form.disable();
        // Store organizationId in a variable for easy access
        (this as any)._segmentOrganizationId = segment.organizationId;
      }
    }
  }

  ngOnInit(): void {
    this.loadOrganizations();
    
    // If in assign users mode, load segment details first to get organization
    if (this.isAssignUsersMode && this.dialogRef.data?.segment?.id) {
      this.loadSegmentUsers();
    }
    
    // Load users after a short delay to ensure organization is set
    setTimeout(() => {
      this.loadUsers();
    }, 50);
    
    // Watch for organization changes to filter users (only if form is enabled)
    if (!this.isAssignUsersMode) {
      this.form.get('organizationId')?.valueChanges.subscribe((orgId) => {
        this.filterUsersByOrganization(orgId);
      });
    }

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  loadSegmentUsers(): void {
    this.segmentService.getSegment(this.dialogRef.data.segment.id).subscribe({
      next: (response) => {
        const segment = response.result;
        this.selectedUserIds = segment.userIds || [];
        
        // After loading segment users, ensure users are filtered by organization
        // Wait a bit for users to be loaded first
        setTimeout(() => {
          if (segment.organizationId) {
            this.filterUsersByOrganization(segment.organizationId);
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error loading segment users:', error);
        this.toastr.error(error.error?.message || this.translationService.instant('common.error'));
      },
    });
  }

  loadOrganizations(): void {
    this.isLoadingOrganizations = true;
    this.organizationService.getOrganizations(1, 1000).subscribe({
      next: (response) => {
        this.organizations = response.result;
        this.isLoadingOrganizations = false;
        
        // If editing, filter users by the selected organization
        if (this.isEdit && this.form.get('organizationId')?.value) {
          this.filterUsersByOrganization(this.form.get('organizationId')?.value);
        }
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.toastr.error(this.translationService.instant('common.error'));
        this.isLoadingOrganizations = false;
      },
    });
  }

  loadUsers(): void {
    this.isLoadingUsers = true;
    this.userService.getUsers(1, 1000).subscribe({
      next: (response: any) => {
        console.log('Users loaded:', response);
        this.users = response.result || [];
        this.isLoadingUsers = false;
        
        // Determine organization ID to filter by
        let orgId: any = null;
        
        if (this.isAssignUsersMode) {
          // In assign users mode, try multiple ways to get organizationId
          orgId = (this as any)._segmentOrganizationId || 
                  this.dialogRef.data?.segment?.organizationId ||
                  this.form.get('organizationId')?.value;
        } else {
          // Get from form
          orgId = this.form.get('organizationId')?.value;
        }
        
        // Filter users by organization
        if (orgId) {
          console.log('Filtering users by organization:', orgId);
          this.filterUsersByOrganization(orgId);
        } else {
          console.log('No organization ID available, clearing filtered users');
          this.filteredUsers = [];
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.toastr.error(error.error?.message || this.translationService.instant('common.error'));
        this.isLoadingUsers = false;
        this.filteredUsers = [];
        this.cdr.detectChanges();
      },
    });
  }

  filterUsersByOrganization(orgId: any): void {
    if (!orgId) {
      this.filteredUsers = [];
      return;
    }
    
    const orgIdNum = typeof orgId === 'string' ? parseInt(orgId) : orgId;
    
    // Filter users - check both direct organizationId and nested path
    this.filteredUsers = this.users.filter(user => {
      // Check direct organizationId property
      if (user.organizationId && user.organizationId === orgIdNum) {
        return true;
      }
      // Check nested organizationId (position.department.organizationId)
      if (user.position?.department?.organizationId === orgIdNum) {
        return true;
      }
      return false;
    });
    
    console.log(`Filtered ${this.filteredUsers.length} users for organization ${orgIdNum}`);
  }

  toggleUserSelection(userId: string): void {
    const index = this.selectedUserIds.indexOf(userId);
    if (index > -1) {
      this.selectedUserIds.splice(index, 1);
    } else {
      this.selectedUserIds.push(userId);
    }
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUserIds.includes(userId);
  }

  onSubmit(): void {
    // Special handling for assign users mode
    if (this.isAssignUsersMode) {
      this.isSubmitting = true;
      const segmentId = this.dialogRef.data.segment.id;
      
      this.segmentService.assignUsers(segmentId, this.selectedUserIds).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('segment.assignUsersSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(error.error?.message || this.translationService.instant('segment.assignUsersError'));
          console.error('Error assigning users:', error);
          this.isSubmitting = false;
        },
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error(this.translationService.instant('segment.formInvalid'));
      return;
    }

    this.isSubmitting = true;
    const formData = this.form.value;
    
    const payload = {
      name: formData.name,
      nameAr: formData.nameAr,
      code: formData.code,
      organizationId: parseInt(formData.organizationId),
      userIds: this.selectedUserIds,
      isActive: formData.isActive !== false,
    };

    if (this.isEdit) {
      const updatePayload = {
        ...payload,
        id: this.dialogRef.data.segment.id,
      };
      
      this.segmentService
        .updateSegment(this.dialogRef.data.segment.id, updatePayload)
        .subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('segment.updateSuccess'));
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.toastr.error(error.error?.message || this.translationService.instant('segment.updateError'));
            console.error('Error updating segment:', error);
            this.isSubmitting = false;
          },
        });
    } else {
      this.segmentService.createSegment(payload).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('segment.createSuccess'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.toastr.error(error.error?.message || this.translationService.instant('segment.createError'));
          console.error('Error creating segment:', error);
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
