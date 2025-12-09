import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { UserService } from '../../../../services/user.service';
import { PositionService } from '../../../../services/position.service';
import { JobTitleService } from '../../../../services/job-title.service';
import { OrganizationService } from '../../../../services/organization.service';
import { DepartmentService } from '../../../../services/department.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../../../services/loading.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogRef } from '@ngneat/dialog';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './user-form.component.html',
  styles: [`
    :host {
      display: block;
      max-height: 90vh;
      overflow: hidden;
    }
    
    /* Custom scrollbar styling for the form container */
    .form-scroll-container::-webkit-scrollbar {
      width: 8px;
    }
    
    .form-scroll-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .form-scroll-container::-webkit-scrollbar-thumb {
      background: #c9ae81;
      border-radius: 10px;
    }
    
    .form-scroll-container::-webkit-scrollbar-thumb:hover {
      background: #b89a6e;
    }
  `]
})
export class UserFormComponent implements OnInit {
  form: FormGroup;
  positions: any[] = [];
  organizations: any[] = [];
  departments: any[] = [];
  loginMethods: any[] = [];
  roles: any[] = [];
  selectedLoginMethod: number = 0; // Track selected login method: 1=KMNID, 2=AD, 3=Credentials
  selectedOrganization: any = null; // Track selected organization to check isMain
  isSubmitting = false;
  isEdit = false;
  isFullNameFromAD = false;
  generatedPassword: string = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private positionService: PositionService,
    private jobTitleService: JobTitleService,
    private organizationService: OrganizationService,
    private departmentService: DepartmentService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private dialogRef: DialogRef<{ user?: any; organization?: any }>,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      id: [''], // Add ID field for updates
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: [''], // Username for login (optional, defaults to email)
      adUsername: [''], // Not always required - depends on login method
      temporaryPassword: [''], // For Credentials method
      jobTitleId: [''], // Will be conditionally required based on organization.isMain
      organizationId: ['', Validators.required],
      departmentId: [''], // Will be conditionally required based on organization.isMain
      loginMethod: ['', Validators.required],
      roleIds: [[]], // Multiple roles
    });
  }

  ngOnInit(): void {
    console.log('UserFormComponent initialized');
    this.loadOrganizations();
    this.loadRoles();
    // Don't load all positions on init - they will be loaded when department is selected
    
    // Check if editing existing user
    const userData = this.dialogRef.data?.user;
    if (userData) {
      this.isEdit = true;
      this.populateForm(userData);
    }
  }

  loadRoles(): void {
    this.userService.getRoles(1, 100).subscribe({
      next: (response) => {
        this.roles = response.result || [];
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load roles:', error);
      },
    });
  }

  onLoginMethodChange(): void {
    const loginMethod = this.form.get('loginMethod')?.value;
    this.selectedLoginMethod = parseInt(loginMethod) || 0;
    
    console.log('Login method changed to:', this.selectedLoginMethod);
    
    // Update field validators based on login method
    const adUsernameControl = this.form.get('adUsername');
    const temporaryPasswordControl = this.form.get('temporaryPassword');
    
    // Reset validators
    adUsernameControl?.clearValidators();
    temporaryPasswordControl?.clearValidators();
    
    if (this.selectedLoginMethod === 2) {
      // Active Directory: AD Username is required
      adUsernameControl?.setValidators([Validators.required]);
    } else if (this.selectedLoginMethod === 3) {
      // Credentials: Generate temporary password
      this.generateTemporaryPassword();
      temporaryPasswordControl?.setValidators([Validators.required]);
    }
    
    adUsernameControl?.updateValueAndValidity();
    temporaryPasswordControl?.updateValueAndValidity();
    
    // Trigger change detection to update UI
    this.cdr.detectChanges();
  }

  generateTemporaryPassword(): void {
    // Generate a secure random password
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    this.generatedPassword = password;
    this.form.patchValue({ temporaryPassword: password });
    this.cdr.detectChanges();
    console.log('Generated temporary password');
  }

  populateForm(user: any): void {
    const orgId = user.organizationId || user.organization?.id;
    const deptId = user.departmentId || user.department?.id;
    
    console.log('Populating form with user:', user);
    
    this.selectedLoginMethod = user.loginMethod || 2;
    
    // Find and set selected organization
    if (orgId) {
      this.selectedOrganization = this.organizations.find(org => org.id == orgId);
      if (!this.selectedOrganization && user.organization) {
        this.selectedOrganization = user.organization;
      }
    }
    
    this.form.patchValue({
      id: user.id, // Make sure ID is included for updates
      fullName: user.fullName || '',
      email: user.email || '',
      username: user.userName || user.username || user.email || '', // Use userName from Identity, username from DTO, or fallback to email
      adUsername: user.adUsername || '',
      organizationId: orgId || '',
      departmentId: deptId || '',
      jobTitleId: user.jobTitleId || user.jobTitle?.id || '',
      loginMethod: user.loginMethod || 2, // Default to ActiveDirectory
      temporaryPassword: user.temporaryPassword || '',
    });

    // Update validators based on organization.isMain
    const isMain = this.selectedOrganization?.isMain || false;
    const departmentControl = this.form.get('departmentId');
    const jobTitleControl = this.form.get('jobTitleId');
    
    if (isMain) {
      departmentControl?.setValidators([Validators.required]);
      jobTitleControl?.setValidators([Validators.required]);
    } else {
      departmentControl?.clearValidators();
      jobTitleControl?.clearValidators();
    }
    departmentControl?.updateValueAndValidity();
    jobTitleControl?.updateValueAndValidity();

    // Load login methods and departments for the organization
    if (orgId) {
      this.loadLoginMethods(orgId);
      if (isMain) {
        this.loadDepartments(String(orgId));
      }
    }
    
    // Load job titles for the selected department (only if main organization)
    if (deptId && isMain) {
      // Load job titles after a short delay to ensure departments are loaded
      // Preserve the jobTitleId when editing
      const preservedJobTitleId = user.jobTitleId || user.jobTitle?.id || '';
      setTimeout(() => {
        this.loadPositions(deptId);
        // Restore job title selection after positions are loaded
        if (preservedJobTitleId) {
          setTimeout(() => {
            this.form.patchValue({ jobTitleId: preservedJobTitleId });
            this.cdr.detectChanges();
          }, 200);
        }
      }, 100);
    }
    
    // Load user roles if editing
    if (user.id) {
      this.loadUserRoles(user.id);
    }
  }

  loadUserRoles(userId: string): void {
    this.userService.getUserRoles(1, 100).subscribe({
      next: (response) => {
        const userRoles = response.result.filter((ur: any) => ur.userId === userId);
        const roleIds = userRoles.map((ur: any) => ur.roleId);
        this.form.patchValue({ roleIds });
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load user roles:', error);
      },
    });
  }

  onRoleChange(event: any, roleId: number): void {
    const currentRoleIds = this.form.get('roleIds')?.value || [];
    if (event.target.checked) {
      // Add role
      if (!currentRoleIds.includes(roleId)) {
        this.form.patchValue({ roleIds: [...currentRoleIds, roleId] });
      }
    } else {
      // Remove role
      this.form.patchValue({ roleIds: currentRoleIds.filter((id: number) => id !== roleId) });
    }
    this.cdr.detectChanges();
  }

  isRoleSelected(roleId: number): boolean {
    const roleIds = this.form.get('roleIds')?.value || [];
    return roleIds.includes(roleId);
  }

  loadOrganizations(): void {
    this.organizationService.getOrganizations(1, 100).subscribe({
      next: (response) => {
        this.organizations = response.result;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(
          error.error.message || 'Failed to load organizations'
        );
      },
    });
  }

  loadDepartments(organizationId: string): void {
    this.departmentService.getDepartments(1, 100).subscribe({
      next: (response) => {
        this.departments = response.result.filter(
          (dept: any) => dept.organizationId == organizationId
        );
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(error.error.message || 'Failed to load departments');
      },
    });
  }

  loadPositions(departmentId?: number): void {
    console.log('Loading job titles for department:', departmentId);
    
    // Use JobTitleService which supports department filtering
    this.jobTitleService.getJobTitles(1, 1000, departmentId || undefined).subscribe({
      next: (response) => {
        // Map JobTitles to the format expected by the form
        this.positions = response.result.map((jobTitle: any) => ({
          id: jobTitle.id,
          title: jobTitle.nameEn || jobTitle.title || jobTitle.name,
          nameEn: jobTitle.nameEn,
          nameAr: jobTitle.nameAr,
          departmentId: jobTitle.departmentId,
          department: jobTitle.department
        }));
        console.log(`Job titles loaded${departmentId ? ` for department ${departmentId}` : ' (all)'}:`, this.positions.length);
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load job titles:', error);
        this.toastr.error(error.error?.message || 'Failed to load job titles');
      },
    });
  }

  onOrganizationChange(): void {
    const organizationId = this.form.get('organizationId')?.value;
    if (organizationId) {
      // Find the selected organization to check isMain
      this.selectedOrganization = this.organizations.find(org => org.id == organizationId);
      const isMain = this.selectedOrganization?.isMain || false;
      
      // Update validators based on isMain
      const departmentControl = this.form.get('departmentId');
      const jobTitleControl = this.form.get('jobTitleId');
      
      if (isMain) {
        // Main organization: Department and Job Title are required
        departmentControl?.setValidators([Validators.required]);
        jobTitleControl?.setValidators([Validators.required]);
        this.loadDepartments(organizationId);
      } else {
        // Non-main organization: Department and Job Title are not required
        departmentControl?.clearValidators();
        jobTitleControl?.clearValidators();
        this.departments = [];
        this.positions = [];
        // Clear department and job title selections
        this.form.patchValue({ departmentId: '', jobTitleId: '' });
      }
      
      departmentControl?.updateValueAndValidity();
      jobTitleControl?.updateValueAndValidity();
      
      this.loadLoginMethods(organizationId);
      // Reset login method selection when organization changes
      this.form.patchValue({ loginMethod: '' });
      this.selectedLoginMethod = 0;
    } else {
      this.selectedOrganization = null;
      this.departments = [];
      this.positions = [];
      this.loginMethods = [];
      this.form.patchValue({ departmentId: '', jobTitleId: '', loginMethod: '' });
      this.selectedLoginMethod = 0;
      
      // Clear validators
      this.form.get('departmentId')?.clearValidators();
      this.form.get('jobTitleId')?.clearValidators();
      this.form.get('departmentId')?.updateValueAndValidity();
      this.form.get('jobTitleId')?.updateValueAndValidity();
    }
    this.cdr.detectChanges();
  }

  loadLoginMethods(organizationId: number): void {
    this.organizationService.getLoginMethods(organizationId).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          this.loginMethods = response.result;
          // Auto-select first method if only one available
          if (this.loginMethods.length === 1 && !this.isEdit) {
            this.form.patchValue({ loginMethod: this.loginMethods[0].id });
            this.selectedLoginMethod = this.loginMethods[0].id;
          }
          this.cdr.detectChanges();
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to load login methods:', error);
        // Fallback to default methods if API fails
        this.loginMethods = [
          { id: 2, name: 'ActiveDirectory', displayName: 'Active Directory' },
          { id: 3, name: 'Credentials', displayName: 'Credentials (Username/Password)' },
        ];
        this.cdr.detectChanges();
      },
    });
  }

  onDepartmentChange(): void {
    const departmentId = this.form.get('departmentId')?.value;
    const isMain = this.selectedOrganization?.isMain || false;
    
    console.log('Department changed to:', departmentId, 'Organization isMain:', isMain);
    
    // Only allow department changes if organization is main
    if (!isMain) {
      this.form.patchValue({ departmentId: '', jobTitleId: '' });
      this.positions = [];
      this.cdr.detectChanges();
      return;
    }
    
    // Reset job title selection when department changes
    this.form.patchValue({ jobTitleId: '' });
    
    if (departmentId) {
      // Load job titles filtered by selected department using backend API
      this.loadPositions(departmentId);
    } else {
      // No department selected, clear positions
      console.log('No department selected, clearing job titles');
      this.positions = [];
      this.cdr.detectChanges();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    
    // Get raw form values
    const rawValue = this.form.getRawValue();
    
    // Get login method to determine required fields
    const loginMethod = parseInt(rawValue.loginMethod) || 2;
    
    // Check if organization is main to determine if department/jobTitle are required
    const isMain = this.selectedOrganization?.isMain || false;
    
    // Prepare user data with proper type conversions
    const userData: any = {
      fullName: rawValue.fullName || '',
      email: rawValue.email || '',
      username: rawValue.username || undefined, // Username (optional, defaults to email on backend)
      temporaryPassword: rawValue.temporaryPassword || undefined,
      organizationId: parseInt(rawValue.organizationId) || 0,
      loginMethod: loginMethod,
      roleIds: rawValue.roleIds && Array.isArray(rawValue.roleIds) ? rawValue.roleIds : [],
    };
    
    // Only include departmentId and jobTitleId if organization is main
    if (isMain) {
      userData.departmentId = rawValue.departmentId ? parseInt(rawValue.departmentId) : null;
      userData.jobTitleId = rawValue.jobTitleId ? parseInt(rawValue.jobTitleId) : null;
    } else {
      // Non-main organization: don't send departmentId or jobTitleId
      userData.departmentId = null;
      userData.jobTitleId = null;
    }
    
    // Only include adUsername for Active Directory login method (2)
    if (loginMethod === 2 && rawValue.adUsername) {
      userData.adUsername = rawValue.adUsername;
    }
    
    // Remove empty string values and undefined fields
    Object.keys(userData).forEach(key => {
      if (userData[key] === '' || userData[key] === undefined || userData[key] === null) {
        delete userData[key];
      }
    });
    
    // Remove positionId if it exists
    delete userData.positionId;
    
    console.log('Submitting user data:', userData, 'IsEdit:', this.isEdit);

    if (this.isEdit) {
      // Get user ID from form (should be a string for Identity users)
      const userId = rawValue.id;
      if (!userId || userId === '' || userId === null || userId === undefined) {
        console.error('User ID is missing for update. Raw value:', rawValue.id);
        this.toastr.error('User ID is missing. Cannot update user.');
        this.isSubmitting = false;
        return;
      }
      
      // Ensure userId is a string (Identity uses string IDs)
      const userIdString = String(userId);
      
      // Remove id from body - it should only be in the URL
      delete userData.id;
      
      console.log('Updating user with ID:', userIdString, 'Data:', userData);
      
      this.userService.updateUser(userIdString, userData).subscribe({
        next: (response) => {
          console.log('User updated successfully:', response);
          this.toastr.success('User updated successfully');
          this.isSubmitting = false;
          this.dialogRef.close(true);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Failed to update user:', error);
          this.toastr.error('Failed to update user');
          this.isSubmitting = false;
        },
      });
    } else {
      // Remove id field completely when creating new user
      delete userData.id;
      
      this.userService.createUser(userData).subscribe({
        next: (response) => {
          console.log('User created successfully:', response);
          this.toastr.success('User created successfully');
          this.form.reset();
          this.isSubmitting = false;
          this.dialogRef.close(true);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Failed to create user:', error);
          this.toastr.error('Failed to create user');
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  checkADUser() {
    const adUsername = this.form.get('adUsername')?.value;
    if (!adUsername) {
      this.toastr.error('Please enter an AD username');
      return;
    }

    this.loadingService.show();
    this.userService.checkADUser(adUsername).subscribe({
      next: (response) => {
        if (response.statusCode === 200 && response.result) {
          // Auto-fill the full name and email from AD
          this.form.patchValue({
            fullName: response.result.displayName,
            email: response.result.username + '@moo.gov.kw',
          });
          // Enable fullName field if needed
          this.form.get('fullName')?.enable();
          this.isFullNameFromAD = true;
          this.toastr.success('User found in Active Directory');
          this.cdr.detectChanges();
        } else {
          this.isFullNameFromAD = false;
          this.toastr.error('User not found in Active Directory');
        }
        this.loadingService.hide();
      },
      error: (error: HttpErrorResponse) => {
        this.isFullNameFromAD = false;
        this.toastr.error('User not found in Active Directory');
        this.loadingService.hide();
      },
    });
  }
}
