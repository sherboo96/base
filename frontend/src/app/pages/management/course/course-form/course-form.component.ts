import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { CourseService, Course, CourseStatus, CourseLanguage, LocationCategory, CourseLearningOutcome, CourseContent, TargetUserType, AdoptionType, CourseAdoptionUser, CourseContact } from '../../../../services/course.service';
import { CourseTabService } from '../../../../services/course-tab.service';
import { LocationService, LocationCategory as LocCategory } from '../../../../services/location.service';
import { InstructorService } from '../../../../services/instructor.service';
import { OrganizationService } from '../../../../services/organization.service';
import { DepartmentService } from '../../../../services/department.service';
import { SegmentService } from '../../../../services/segment.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';
import { StorageService } from '../../../../services/storage.service';

@Component({
  selector: 'app-course-form',
  templateUrl: './course-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        height: 90vh;
        overflow: hidden;
      }
      
      .dialog-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      
      .form-scroll-container {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: auto;
        scrollbar-color: #0b5367 #f1f1f1;
        -webkit-overflow-scrolling: touch;
      }
      
      .form-scroll-container::-webkit-scrollbar {
        width: 14px;
      }
      
      .form-scroll-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
        margin: 4px 0;
      }
      
      .form-scroll-container::-webkit-scrollbar-thumb {
        background: #0b5367;
        border-radius: 10px;
        border: 2px solid #f1f1f1;
        min-height: 40px;
      }
      
      .form-scroll-container::-webkit-scrollbar-thumb:hover {
        background: #094152;
      }
      
      .form-scroll-container::-webkit-scrollbar-thumb:active {
        background: #062d38;
      }
      
      .dialog-header {
        flex-shrink: 0;
      }
      
      .dialog-actions {
        flex-shrink: 0;
      }
    `,
  ],
})
export class CourseFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  courseTabs: any[] = [];
  organizations: any[] = [];
  locations: any[] = [];
  instructors: any[] = [];
  departments: any[] = [];
  segments: any[] = [];
  CourseStatus = CourseStatus;
  CourseLanguage = CourseLanguage;
  LocationCategory = LocationCategory;
  TargetUserType = TargetUserType;
  AdoptionType = AdoptionType;
  filteredLocations: any[] = [];
  showStatusField = false;
  showCourseTabField = false;
  organizationDisabled = false;
  selectedOrganization: any = null;
  isMainOrg: boolean = false; // Explicit property to track if organization is main

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private courseTabService: CourseTabService,
    private locationService: LocationService,
    private instructorService: InstructorService,
    private organizationService: OrganizationService,
    private departmentService: DepartmentService,
    private segmentService: SegmentService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ course?: Course; courseTabs?: any[]; organizations?: any[]; defaultCourseTabId?: number }>,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService,
    private storageService: StorageService
  ) {
    this.form = this.fb.group({
      code: ['', Validators.required],
      courseTitle: ['', Validators.required],
      courseTitleAr: [''],
      description: [''],
      descriptionAr: [''],
      language: [CourseLanguage.English, Validators.required],
      status: [CourseStatus.Draft, Validators.required],
      category: [LocationCategory.Onsite, Validators.required],
      locationId: [null],
      startDateTime: [null],
      endDateTime: [null],
      availableSeats: [0, [Validators.required, Validators.min(0)]],
      price: [0, [Validators.min(0)]],
      kpiWeight: [0, [Validators.min(0)]],
      digitLibraryAvailability: [false],
      certificateAvailable: [false],
      courseTabId: [null, Validators.required],
      organizationId: [null, Validators.required],
      learningOutcomes: this.fb.array([]),
      courseContents: this.fb.array([]),
      instructorIds: [[]],
      targetUserType: [null],
      targetDepartmentIds: [[]],
      targetDepartmentRole: [null], // DEPRECATED: Keep for backward compatibility
      targetDepartmentRoles: [{}], // Dictionary: { departmentId: role }
      targetOrganizationIds: [[]],
      targetSegmentIds: [[]],
    });

    if (this.dialogRef.data?.course) {
      this.isEdit = true;
      this.showStatusField = true; // Show status in edit mode
      this.showCourseTabField = true; // Show course tab in edit mode
      const course = this.dialogRef.data.course;
      this.patchFormWithCourse(course);
    } else {
      // Add mode: hide status and course tab, set defaults
      this.showStatusField = false;
      this.showCourseTabField = false;
      
      if (this.dialogRef.data?.defaultCourseTabId) {
        this.form.patchValue({
          courseTabId: this.dialogRef.data.defaultCourseTabId,
        });
      }
    }

    if (this.dialogRef.data?.courseTabs) {
      this.courseTabs = this.dialogRef.data.courseTabs;
    }

    if (this.dialogRef.data?.organizations) {
      this.organizations = this.dialogRef.data.organizations;
      // Set selectedOrganization if course is being edited
      if (this.isEdit && this.dialogRef.data?.course?.organizationId) {
        const orgId = this.dialogRef.data.course.organizationId;
        this.selectedOrganization = this.organizations.find(org => org.id === orgId);
        // Also check if organization is in course data
        if (!this.selectedOrganization && this.dialogRef.data?.course?.organization) {
          this.selectedOrganization = this.dialogRef.data.course.organization;
        }
        // Update isMainOrg property
        if (this.selectedOrganization) {
          this.isMainOrg = this.selectedOrganization.isMain === true;
        }
      }
      // Also check if organizationId is already set in form (for add mode with pre-selected org)
      const currentOrgId = this.form.get('organizationId')?.value;
      if (currentOrgId && !this.selectedOrganization) {
        this.selectedOrganization = this.organizations.find(org => org.id === currentOrgId);
        // Update isMainOrg property
        if (this.selectedOrganization) {
          this.isMainOrg = this.selectedOrganization.isMain === true;
        }
      }
    }
  }

  ngOnInit(): void {
    this.loadCourseTabs();
    this.loadOrganizations();
    this.loadInstructors();
    
    // Set selectedOrganization if organizationId is already set (e.g., from dialog data or form initialization)
    const currentOrgId = this.form.get('organizationId')?.value;
    if (currentOrgId && !this.selectedOrganization) {
      // Try to find from dialog data organizations first (most reliable)
      if (this.dialogRef.data?.organizations && this.dialogRef.data.organizations.length > 0) {
        this.selectedOrganization = this.dialogRef.data.organizations.find((org: any) => org.id === currentOrgId);
      }
      // If not found, try organizations array
      if (!this.selectedOrganization && this.organizations.length > 0) {
        this.selectedOrganization = this.organizations.find(org => org.id === currentOrgId);
      }
      if (this.selectedOrganization) {
        this.isMainOrg = this.selectedOrganization.isMain === true; // Update explicit property
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    }
    
    // Watch category changes to filter locations
    this.form.get('category')?.valueChanges.subscribe(category => {
      this.filterLocationsByCategory(category);
    });

    // Watch organization changes to load locations, departments, and segments
    this.form.get('organizationId')?.valueChanges.subscribe(orgId => {
      if (orgId) {
        this.loadLocations(orgId);
        
        // Find organization from multiple sources - try synchronously first
        let foundOrg = null;
        
        // First try dialog data organizations (most reliable source)
        if (this.dialogRef.data?.organizations && this.dialogRef.data.organizations.length > 0) {
          foundOrg = this.dialogRef.data.organizations.find((org: any) => org.id === orgId);
        }
        
        // If not found, try organizations array
        if (!foundOrg && this.organizations.length > 0) {
          foundOrg = this.organizations.find(org => org.id === orgId);
        }
        
        // If found, set immediately and load data
        if (foundOrg) {
          this.selectedOrganization = foundOrg;
          this.isMainOrg = foundOrg.isMain === true; // Update explicit property
          this.loadOrganizationData(orgId, this.selectedOrganization);
          // Force change detection to update the template immediately
          // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          }, 0);
        } else if (this.organizations.length === 0) {
          // If organizations not loaded yet, wait a bit and try again
          setTimeout(() => {
            let retryFoundOrg = null;
            if (this.organizations.length > 0) {
              retryFoundOrg = this.organizations.find(org => org.id === orgId);
            }
            if (!retryFoundOrg && this.dialogRef.data?.organizations) {
              retryFoundOrg = this.dialogRef.data.organizations.find((org: any) => org.id === orgId);
            }
            if (retryFoundOrg) {
              this.selectedOrganization = retryFoundOrg;
              this.isMainOrg = retryFoundOrg.isMain === true; // Update explicit property
              this.loadOrganizationData(orgId, this.selectedOrganization);
              this.cdr.markForCheck();
              this.cdr.detectChanges();
            }
          }, 100);
        }
      } else {
        this.selectedOrganization = null;
        this.isMainOrg = false; // Reset when no organization selected
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });

    // Initialize location filter
    const category = this.form.get('category')?.value;
    if (category) {
      this.filterLocationsByCategory(category);
    }
  }

  patchFormWithCourse(course: Course): void {
    this.form.patchValue({
      code: course.code,
      courseTitle: course.courseTitle,
      courseTitleAr: course.courseTitleAr || '',
      description: course.description || '',
      descriptionAr: course.descriptionAr || '',
      language: course.language,
      status: course.status,
      category: course.category,
      locationId: course.locationId,
      startDateTime: course.startDateTime ? new Date(course.startDateTime).toISOString().slice(0, 16) : null,
      endDateTime: course.endDateTime ? new Date(course.endDateTime).toISOString().slice(0, 16) : null,
      availableSeats: course.availableSeats,
      price: course.price,
      kpiWeight: course.kpiWeight,
      digitLibraryAvailability: course.digitLibraryAvailability,
      certificateAvailable: course.certificateAvailable,
      courseTabId: course.courseTabId,
      organizationId: course.organizationId,
      instructorIds: course.instructorIds || [],
      targetUserType: course.targetUserType !== null && course.targetUserType !== undefined 
        ? (typeof course.targetUserType === 'string' ? parseInt(course.targetUserType, 10) : course.targetUserType)
        : null,
      targetDepartmentIds: course.targetDepartmentIds || [],
      targetDepartmentRole: course.targetDepartmentRole || null, // DEPRECATED: Keep for backward compatibility
      targetDepartmentRoles: course.targetDepartmentRoles || {},
      targetOrganizationIds: course.targetOrganizationIds || [],
      targetSegmentIds: course.targetSegmentIds || [],
    });
    
    // Set selected organization for conditional display (if organizations are already loaded)
    if (this.organizations.length > 0) {
      this.selectedOrganization = this.organizations.find(org => org.id === course.organizationId);
    }
    // Also check if organization is in course data
    if (!this.selectedOrganization && course.organization) {
      this.selectedOrganization = course.organization;
    }
    // Update isMainOrg property
    if (this.selectedOrganization) {
      this.isMainOrg = this.selectedOrganization.isMain === true;
    }
    // Otherwise, selectedOrganization will be set when organizations load in loadOrganizations()

    // Patch learning outcomes
    const learningOutcomesArray = this.form.get('learningOutcomes') as FormArray;
    learningOutcomesArray.clear();
    if (course.learningOutcomes && course.learningOutcomes.length > 0) {
      course.learningOutcomes.forEach(outcome => {
        learningOutcomesArray.push(this.fb.group({
          name: [outcome.name, Validators.required],
          nameAr: [outcome.nameAr || ''],
        }));
      });
    }

    // Patch course contents
    const courseContentsArray = this.form.get('courseContents') as FormArray;
    courseContentsArray.clear();
    if (course.courseContents && course.courseContents.length > 0) {
      course.courseContents.forEach(content => {
        courseContentsArray.push(this.fb.group({
          name: [content.name, Validators.required],
          nameAr: [content.nameAr || ''],
        }));
      });
    }

    // Load locations, departments, and segments for the organization
    if (course.organizationId) {
      this.loadLocations(course.organizationId);
      if (this.selectedOrganization?.isMain) {
        this.loadDepartments(course.organizationId);
        this.loadSegments(course.organizationId);
      } else {
        // Load segments for non-main organizations too
        this.loadSegments(course.organizationId);
      }
    }
  }
  
  loadOrganizationData(orgId: number, organization: any): void {
    if (!organization) return;
    
    if (organization.isMain) {
      this.loadDepartments(orgId);
      this.loadSegments(orgId);
    } else {
      // For non-main organizations, load segments for the selected organization
      this.loadSegments(orgId);
      // Clear main-organization-specific fields
        this.form.patchValue({
        targetDepartmentIds: [],
        targetDepartmentRole: null, // DEPRECATED
        targetDepartmentRoles: {},
        targetOrganizationIds: [],
      });
    }
  }

  loadDepartments(organizationId: number): void {
    this.departmentService.getAllDepartments(organizationId).subscribe({
      next: (response) => {
        this.departments = response.result || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.departments = [];
        this.cdr.detectChanges();
      },
    });
  }
  
  loadSegments(organizationId: number): void {
    this.segmentService.getSegments(1, 1000, organizationId).subscribe({
      next: (response) => {
        this.segments = response.result || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading segments:', error);
        this.segments = [];
        this.cdr.detectChanges();
      },
    });
  }

  loadCourseTabs(): void {
    if (this.courseTabs.length === 0) {
      this.courseTabService.getCourseTabs(1, 1000).subscribe({
        next: (response) => {
          this.courseTabs = response.result || [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading course tabs:', error);
        },
      });
    }
  }

  loadOrganizations(): void {
    if (this.organizations.length === 0) {
      this.organizationService.getOrganizations(1, 1000).subscribe({
        next: (response) => {
          this.organizations = response.result || [];
          
          // Set selectedOrganization if organizationId is already set in form (edit mode or pre-selected)
          const currentOrgId = this.form.get('organizationId')?.value;
          if (currentOrgId) {
            this.selectedOrganization = this.organizations.find(org => org.id === currentOrgId);
            // Also check if organization is in course data (for edit mode)
            if (!this.selectedOrganization && this.isEdit && this.dialogRef.data?.course?.organization) {
              const courseOrg = this.dialogRef.data.course.organization;
              if (courseOrg.id === currentOrgId) {
                this.selectedOrganization = courseOrg;
              }
            }
            // Update isMainOrg property
            if (this.selectedOrganization) {
              this.isMainOrg = this.selectedOrganization.isMain === true;
            } else {
              this.isMainOrg = false;
            }
            if (this.selectedOrganization?.isMain) {
              this.loadDepartments(this.selectedOrganization.id);
              this.loadSegments(this.selectedOrganization.id);
            } else {
              // Load segments for non-main organizations too
              this.loadSegments(this.selectedOrganization.id);
            }
            this.cdr.detectChanges();
          }
          
          // If only one organization and not in edit mode, auto-select and disable
          if (!this.isEdit && this.organizations.length === 1 && !currentOrgId) {
        this.form.patchValue({ organizationId: this.organizations[0].id });
        this.selectedOrganization = this.organizations[0];
        this.isMainOrg = this.organizations[0].isMain === true; // Update explicit property
        this.organizationDisabled = true;
        // Load locations for this organization
        this.loadLocations(this.organizations[0].id);
        if (this.organizations[0].isMain) {
          this.loadDepartments(this.organizations[0].id);
          this.loadSegments(this.organizations[0].id);
        }
        this.cdr.detectChanges();
          } else if (!this.isEdit && !currentOrgId) {
            // Try to get organization from current user
            const currentUser = this.storageService.getItem<any>('currentUser');
            const userOrganizationId = currentUser?.organizationId || currentUser?.organization?.id;
            if (userOrganizationId) {
              const userOrg = this.organizations.find(org => org.id === userOrganizationId);
              if (userOrg) {
                this.form.patchValue({ organizationId: userOrganizationId });
                this.selectedOrganization = userOrg;
                this.isMainOrg = userOrg.isMain === true; // Update explicit property
                if (this.organizations.length === 1) {
                  this.organizationDisabled = true;
                }
                this.loadLocations(userOrganizationId);
                if (userOrg.isMain) {
                  this.loadDepartments(userOrganizationId);
                  this.loadSegments(userOrganizationId);
                } else {
                  // Load segments for non-main organizations too
                  this.loadSegments(userOrganizationId);
                }
                this.cdr.detectChanges();
              }
            }
          }
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading organizations:', error);
        },
      });
    } else {
      // If organizations were passed in, check if we should auto-select
      const currentOrgId = this.form.get('organizationId')?.value;
      if (currentOrgId) {
        this.selectedOrganization = this.organizations.find(org => org.id === currentOrgId);
        // Also check if organization is in course data (for edit mode)
        if (!this.selectedOrganization && this.isEdit && this.dialogRef.data?.course?.organization) {
          const courseOrg = this.dialogRef.data.course.organization;
          if (courseOrg.id === currentOrgId) {
            this.selectedOrganization = courseOrg;
          }
        }
        // Update isMainOrg property
        if (this.selectedOrganization) {
          this.isMainOrg = this.selectedOrganization.isMain === true;
        } else {
          this.isMainOrg = false;
        }
        this.cdr.detectChanges();
      } else if (!this.isEdit && this.organizations.length === 1) {
        this.form.patchValue({ organizationId: this.organizations[0].id });
        this.selectedOrganization = this.organizations[0];
        this.isMainOrg = this.organizations[0].isMain === true; // Update explicit property
        this.organizationDisabled = true;
        this.loadLocations(this.organizations[0].id);
        if (this.organizations[0].isMain) {
          this.loadDepartments(this.organizations[0].id);
          this.loadSegments(this.organizations[0].id);
        }
        this.cdr.detectChanges();
      }
    }
  }

  loadLocations(organizationId: number): void {
    this.locationService.getLocations(1, 1000, undefined, organizationId).subscribe({
      next: (response) => {
        // Filter for active, non-deleted locations
        this.locations = (response.result || []).filter(loc => loc.isActive && !loc.isDeleted);
        const category = this.form.get('category')?.value;
        this.filterLocationsByCategory(category);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading locations:', error);
        this.locations = [];
        this.filteredLocations = [];
        this.cdr.detectChanges();
      },
    });
  }

  filterLocationsByCategory(category: LocationCategory | string | number | null | undefined): void {
    if (!category && category !== 0) {
      // Show all locations if no category is selected
      this.filteredLocations = this.locations;
      this.cdr.detectChanges();
      return;
    }
    
    // Convert category to number for comparison
    let categoryValue: number;
    if (typeof category === 'string') {
      // Handle string enum names like "Onsite", "Online", etc.
      const enumKey = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
      categoryValue = LocationCategory[enumKey as keyof typeof LocationCategory] ?? Number(category);
    } else {
      categoryValue = Number(category);
    }
    
    // Filter locations by category - compare as numbers
    this.filteredLocations = this.locations.filter(loc => {
      const locCategory = typeof loc.category === 'string' 
        ? LocationCategory[loc.category as keyof typeof LocationCategory] 
        : Number(loc.category);
      return Number(locCategory) === Number(categoryValue);
    });
    
    // Reset locationId if current selection is not in filtered list
    const currentLocationId = this.form.get('locationId')?.value;
    if (currentLocationId && !this.filteredLocations.find(l => l.id === currentLocationId)) {
      this.form.patchValue({ locationId: null });
    }
    this.cdr.detectChanges();
  }

  loadInstructors(): void {
    this.instructorService.getInstructors(1, 1000).subscribe({
      next: (response) => {
        this.instructors = response.result || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading instructors:', error);
      },
    });
  }

  get learningOutcomesArray(): FormArray {
    return this.form.get('learningOutcomes') as FormArray;
  }

  get courseContentsArray(): FormArray {
    return this.form.get('courseContents') as FormArray;
  }

  addLearningOutcome(): void {
    this.learningOutcomesArray.push(this.fb.group({
      name: ['', Validators.required],
      nameAr: [''],
    }));
  }

  removeLearningOutcome(index: number): void {
    this.learningOutcomesArray.removeAt(index);
  }

  addCourseContent(): void {
    this.courseContentsArray.push(this.fb.group({
      name: ['', Validators.required],
      nameAr: [''],
    }));
  }

  removeCourseContent(index: number): void {
    this.courseContentsArray.removeAt(index);
  }

  toggleInstructor(instructorId: number, event: any): void {
    const instructorIds = this.form.get('instructorIds')?.value || [];
    if (event.target.checked) {
      if (!instructorIds.includes(instructorId)) {
        instructorIds.push(instructorId);
      }
    } else {
      const index = instructorIds.indexOf(instructorId);
      if (index > -1) {
        instructorIds.splice(index, 1);
      }
    }
    this.form.patchValue({ instructorIds });
  }
  
  toggleDepartment(departmentId: number, event: any): void {
    const departmentIds = this.form.get('targetDepartmentIds')?.value || [];
    const departmentRoles = this.form.get('targetDepartmentRoles')?.value || {};
    
    if (event.target.checked) {
      if (!departmentIds.includes(departmentId)) {
        departmentIds.push(departmentId);
        // Initialize role to null if not set
        if (!departmentRoles[departmentId]) {
          departmentRoles[departmentId] = null;
        }
      }
    } else {
      const index = departmentIds.indexOf(departmentId);
      if (index > -1) {
        departmentIds.splice(index, 1);
      }
      // Remove role when department is unchecked
      delete departmentRoles[departmentId];
    }
    this.form.patchValue({ 
      targetDepartmentIds: departmentIds,
      targetDepartmentRoles: { ...departmentRoles }
    });
  }
  
  setDepartmentRole(departmentId: number, role: string | null): void {
    const departmentRoles = this.form.get('targetDepartmentRoles')?.value || {};
    if (role) {
      departmentRoles[departmentId] = role;
    } else {
      delete departmentRoles[departmentId];
    }
    this.form.patchValue({ 
      targetDepartmentRoles: { ...departmentRoles }
    });
  }
  
  getDepartmentRole(departmentId: number): string | null {
    const departmentRoles = this.form.get('targetDepartmentRoles')?.value || {};
    return departmentRoles[departmentId] || null;
  }
  
  toggleOrganization(organizationId: number, event: any): void {
    const organizationIds = this.form.get('targetOrganizationIds')?.value || [];
    if (event.target.checked) {
      if (!organizationIds.includes(organizationId)) {
        organizationIds.push(organizationId);
      }
    } else {
      const index = organizationIds.indexOf(organizationId);
      if (index > -1) {
        organizationIds.splice(index, 1);
      }
    }
    this.form.patchValue({ targetOrganizationIds: organizationIds });
  }
  
  toggleSegment(segmentId: number, event: any): void {
    const segmentIds = this.form.get('targetSegmentIds')?.value || [];
    if (event.target.checked) {
      if (!segmentIds.includes(segmentId)) {
        segmentIds.push(segmentId);
      }
    } else {
      const index = segmentIds.indexOf(segmentId);
      if (index > -1) {
        segmentIds.splice(index, 1);
      }
    }
    this.form.patchValue({ targetSegmentIds: segmentIds });
  }
  
  onTargetUserTypeChange(): void {
    const targetUserType = this.form.get('targetUserType')?.value;
    const orgId = this.form.get('organizationId')?.value;
    
    // Convert to number if it's a string
    const typeValue = targetUserType !== null && typeof targetUserType === 'string' 
      ? parseInt(targetUserType, 10) 
      : targetUserType;
    
    if (typeValue !== null) {
      this.form.patchValue({ targetUserType: typeValue });
    }
    
    // Ensure organization is selected
    if (!orgId) {
      this.cdr.detectChanges();
      return;
    }
    
    // Ensure selectedOrganization is set - try multiple sources
    if (!this.selectedOrganization || this.selectedOrganization.id !== orgId) {
      // First try organizations array
      if (this.organizations.length > 0) {
        this.selectedOrganization = this.organizations.find(org => org.id === orgId);
      }
      // If not found, try dialog data organizations
      if (!this.selectedOrganization && this.dialogRef.data?.organizations) {
        this.selectedOrganization = this.dialogRef.data.organizations.find((org: any) => org.id === orgId);
      }
      // If still not found and in edit mode, try course organization
      if (!this.selectedOrganization && this.isEdit && this.dialogRef.data?.course?.organization) {
        const courseOrg = this.dialogRef.data.course.organization;
        if (courseOrg.id === orgId) {
          this.selectedOrganization = courseOrg;
        }
      }
      // Update isMainOrg property
      if (this.selectedOrganization) {
        this.isMainOrg = this.selectedOrganization.isMain === true;
      } else {
        this.isMainOrg = false;
      }
      
      // If still not found, wait for organizations to load
      if (!this.selectedOrganization) {
        const checkInterval = setInterval(() => {
          if (this.organizations.length > 0) {
            clearInterval(checkInterval);
            this.selectedOrganization = this.organizations.find(org => org.id === orgId);
            if (this.selectedOrganization && typeValue !== null) {
              this.loadDataForTargetUserType(typeValue, orgId);
            }
            this.cdr.detectChanges();
          }
        }, 100);
        
        // Clear interval after 2 seconds to avoid infinite loop
        setTimeout(() => clearInterval(checkInterval), 2000);
        this.cdr.detectChanges();
        return;
      }
    }
    
    // Load required data based on target user type
    if (typeValue !== null) {
      this.loadDataForTargetUserType(typeValue, orgId);
    }
    
    // Clear dependent fields when type changes
    this.form.patchValue({
      targetDepartmentIds: [],
      targetDepartmentRole: null, // DEPRECATED
      targetDepartmentRoles: {},
      targetOrganizationIds: [],
      targetSegmentIds: [],
    });
    this.cdr.detectChanges();
  }

  loadDataForTargetUserType(typeValue: number | null, orgId: number): void {
    if (!orgId || typeValue === null) return;
    
    // Ensure selectedOrganization is set
    if (!this.selectedOrganization) {
      if (this.organizations.length > 0) {
        this.selectedOrganization = this.organizations.find(org => org.id === orgId);
      } else {
        // Wait for organizations to load
        return;
      }
    }
    
    if (!this.selectedOrganization) return;
    
    // Update isMainOrg property
    this.isMainOrg = this.selectedOrganization.isMain === true;
    
    const isMain = this.selectedOrganization.isMain;
    
    // For main organizations
    if (isMain) {
      // Always load departments when SpecificDepartments is selected (force reload)
      if (typeValue === TargetUserType.SpecificDepartments) {
        this.loadDepartments(orgId);
      }
      
      // Always load segments when SpecificSegments is selected (force reload)
      if (typeValue === TargetUserType.SpecificSegments) {
        this.loadSegments(orgId);
      }
      
      // Organizations are already loaded in loadOrganizations()
      // No need to reload for SpecificOrganizations
    } else {
      // For non-main organizations, always load segments when needed (force reload)
      if (typeValue === TargetUserType.AllUsersOfOrganization || 
          typeValue === TargetUserType.SpecificOrganizationSegment) {
        this.loadSegments(orgId);
      }
    }
  }
  
  get isTargetUserSectionVisible(): boolean {
    // Show section when an organization is selected
    const orgId = this.form.get('organizationId')?.value;
    return !!orgId;
  }
  
  get isMainOrganization(): boolean {
    // First check if selectedOrganization is set and is main
    if (this.selectedOrganization?.isMain === true) {
      return true;
    }
    
    // Fallback: check form's organizationId and find organization from multiple sources
    const orgId = this.form.get('organizationId')?.value;
    if (orgId) {
      let foundOrg = null;
      
      // First try dialog data organizations (most reliable source, available immediately)
      if (this.dialogRef.data?.organizations && this.dialogRef.data.organizations.length > 0) {
        foundOrg = this.dialogRef.data.organizations.find((o: any) => o.id === orgId);
      }
      
      // If not found, try organizations array
      if (!foundOrg && this.organizations.length > 0) {
        foundOrg = this.organizations.find(o => o.id === orgId);
      }
      
      // If still not found and we're in edit mode, try course organization
      if (!foundOrg && this.isEdit && this.dialogRef.data?.course?.organization) {
        const courseOrg = this.dialogRef.data.course.organization;
        if (courseOrg.id === orgId) {
          foundOrg = courseOrg;
        }
      }
      
      // If found, update selectedOrganization and return isMain status
      if (foundOrg) {
        const needsUpdate = !this.selectedOrganization || this.selectedOrganization.id !== orgId;
        if (needsUpdate) {
          this.selectedOrganization = foundOrg;
          this.isMainOrg = foundOrg.isMain === true; // Update explicit property
        }
        return foundOrg.isMain === true;
      }
    }
    
    return false;
  }
  
  
  get showDepartmentSelection(): boolean {
    if (!this.isMainOrg) return false;
    const targetUserType = this.form.get('targetUserType')?.value;
    const typeValue = typeof targetUserType === 'string' ? parseInt(targetUserType, 10) : targetUserType;
    return typeValue === TargetUserType.SpecificDepartments;
  }
  
  get showOrganizationSelection(): boolean {
    if (!this.isMainOrg) return false;
    const targetUserType = this.form.get('targetUserType')?.value;
    const typeValue = typeof targetUserType === 'string' ? parseInt(targetUserType, 10) : targetUserType;
    return typeValue === TargetUserType.SpecificOrganizations;
  }
  
  get showSegmentSelection(): boolean {
    const targetUserType = this.form.get('targetUserType')?.value;
    if (targetUserType === null || targetUserType === undefined) return false;
    const typeValue = typeof targetUserType === 'string' ? parseInt(targetUserType, 10) : targetUserType;
    if (this.isMainOrg) {
      return typeValue === TargetUserType.SpecificSegments;
    } else {
      return typeValue === TargetUserType.SpecificOrganizationSegment;
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('course.formInvalid'));
      return;
    }

    this.isSubmitting = true;
    const formData = { ...this.form.value };

    // Map courseTitle to name (backend requires name field)
    formData.name = formData.courseTitle;
    formData.nameAr = formData.courseTitleAr || '';

    // Format dates for API
    if (formData.startDateTime) {
      formData.startDateTime = new Date(formData.startDateTime).toISOString();
    }
    if (formData.endDateTime) {
      formData.endDateTime = new Date(formData.endDateTime).toISOString();
    }

    // Handle locationId - convert empty string or 0 to null
    if (!formData.locationId || formData.locationId === 0 || formData.locationId === '') {
      formData.locationId = null;
    }

    // Map learning outcomes - ensure they're properly formatted
    formData.learningOutcomes = this.learningOutcomesArray.value.map((outcome: any) => ({
      name: outcome.name || '',
      nameAr: outcome.nameAr || ''
    }));

    // Map course contents - ensure they're properly formatted
    formData.courseContents = this.courseContentsArray.value.map((content: any) => ({
      name: content.name || '',
      nameAr: content.nameAr || ''
    }));

    // Handle target user fields
    const isMain = this.isMainOrganization;
    
    // Ensure targetUserType is a number (not string)
    if (formData.targetUserType !== null && formData.targetUserType !== undefined) {
      formData.targetUserType = typeof formData.targetUserType === 'string' 
        ? parseInt(formData.targetUserType, 10) 
        : formData.targetUserType;
    } else {
      formData.targetUserType = null;
    }
    
    if (!isMain) {
      // For non-main organizations, clear main-organization-specific fields
      formData.targetDepartmentIds = [];
      formData.targetDepartmentRole = null; // DEPRECATED
      formData.targetDepartmentRoles = null;
      formData.targetOrganizationIds = [];
      // Keep targetSegmentIds for non-main organizations (SpecificOrganizationSegment)
      if (!formData.targetSegmentIds || formData.targetSegmentIds.length === 0) {
        formData.targetSegmentIds = null;
      }
    } else {
      // For main organizations, clean up empty arrays
      if (!formData.targetDepartmentIds || formData.targetDepartmentIds.length === 0) {
        formData.targetDepartmentIds = null;
      }
      if (!formData.targetOrganizationIds || formData.targetOrganizationIds.length === 0) {
        formData.targetOrganizationIds = null;
      }
      if (!formData.targetSegmentIds || formData.targetSegmentIds.length === 0) {
        formData.targetSegmentIds = null;
      }
      // Clean up targetDepartmentRoles - remove null values and empty object
      if (formData.targetDepartmentRoles) {
        const cleanedRoles: { [key: number]: string } = {};
        Object.keys(formData.targetDepartmentRoles).forEach(key => {
          const deptId = parseInt(key, 10);
          const role = formData.targetDepartmentRoles[deptId];
          if (role && formData.targetDepartmentIds?.includes(deptId)) {
            cleanedRoles[deptId] = role;
          }
        });
        formData.targetDepartmentRoles = Object.keys(cleanedRoles).length > 0 ? cleanedRoles : null;
      }
      // Keep targetDepartmentRole for backward compatibility (set to null)
      formData.targetDepartmentRole = null;
    }

    if (this.isEdit) {
      const courseId = this.dialogRef.data.course!.id!;
      this.courseService.updateCourse(courseId, formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('course.updateSuccess'));
          this.dialogRef.close(true);
          this.isSubmitting = false;
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('course.updateError')
          );
          this.isSubmitting = false;
        },
      });
    } else {
      this.courseService.createCourse(formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('course.createSuccess'));
          this.dialogRef.close(true);
          this.isSubmitting = false;
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('course.createError')
          );
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
