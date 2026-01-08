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
      availableOnlineSeats: [0, [Validators.min(0)]],
      price: [0, [Validators.min(0)]],
      kpiWeight: [0, [Validators.min(0)]],
      digitLibraryAvailability: [false],
      certificateAvailable: [false],
      courseTabId: [null, Validators.required],
      organizationId: [{ value: null, disabled: false }, Validators.required],
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
        const defaultTabId = this.dialogRef.data.defaultCourseTabId;
        this.form.patchValue({
          courseTabId: defaultTabId,
        });
        // Generate code if course tab is already available
        if (this.courseTabs.length > 0) {
          this.generateCodeForCourseTab(defaultTabId);
        }
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
    
    // Watch category changes – reload locations for the selected organization (backend will filter)
    this.form.get('category')?.valueChanges.subscribe(() => {
      const orgId = this.form.get('organizationId')?.value;
      if (orgId) {
        this.loadLocations(orgId);
      }
    });

    // Watch organization changes to load locations, departments, and segments
    this.form.get('organizationId')?.valueChanges.subscribe(orgId => {
      if (orgId) {
        this.loadLocations(orgId);
        // Enable location control when an organization is selected
        this.form.get('locationId')?.enable({ emitEvent: false });
        
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
        // Disable and reset location when no organization is selected
        this.form.get('locationId')?.reset();
        this.form.get('locationId')?.disable({ emitEvent: false });
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });

    // Initialize locations and location control state for current organization (if any)
    const initialOrgId = this.form.get('organizationId')?.value;
    const locationControl = this.form.get('locationId');
    if (initialOrgId) {
      this.loadLocations(initialOrgId);
      locationControl?.enable({ emitEvent: false });
    } else {
      this.filteredLocations = [];
      locationControl?.disable({ emitEvent: false });
    }

    // Watch course tab changes to auto-generate code (only in add mode)
    if (!this.isEdit) {
      this.form.get('courseTabId')?.valueChanges.subscribe(courseTabId => {
        this.generateCodeForCourseTab(courseTabId);
      });
    }
  }

  private lastGeneratedCode: string = '';

  /**
   * Formats a datetime string to local time format (YYYY-MM-DDTHH:mm:ss)
   * Preserves the local time instead of converting to UTC
   * Handles datetime-local input format (YYYY-MM-DDTHH:mm) which is already in local time
   */
  private formatLocalDateTime(dateTime: string | Date): string {
    if (!dateTime) {
      return '';
    }
    
    // If it's a string in datetime-local format (YYYY-MM-DDTHH:mm), append seconds
    if (typeof dateTime === 'string' && dateTime.includes('T') && !dateTime.includes('Z')) {
      // datetime-local format: YYYY-MM-DDTHH:mm
      // Add seconds if not present
      if (dateTime.split(':').length === 2) {
        return `${dateTime}:00`;
      }
      return dateTime;
    }
    
    // If it's a Date object or ISO string, extract local time components
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Get local date/time components (not UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // Return in format: YYYY-MM-DDTHH:mm:ss (local time, no timezone indicator)
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Converts an API datetime (usually ISO, often UTC) to a value suitable for
   * a datetime-local input: YYYY-MM-DDTHH:mm in the user's local time.
   */
  private toLocalInputDateTime(dateTime: string | Date): string {
    if (!dateTime) {
      return '';
    }

    const date = new Date(dateTime);
    if (isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // datetime-local expects no seconds and local time
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Normalizes course.language from API (string or number) to CourseLanguage enum value.
   */
  private normalizeCourseLanguage(value: any): CourseLanguage | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return value as CourseLanguage;
    }

    const str = String(value).trim();
    if (str === 'English' || str === '0') {
      return CourseLanguage.English;
    }
    if (str === 'Arabic' || str === '1') {
      return CourseLanguage.Arabic;
    }

    const num = Number(str);
    return isNaN(num) ? null : (num as CourseLanguage);
  }

  /**
   * Normalizes course.status from API (string or number) to CourseStatus enum value.
   */
  private normalizeCourseStatus(value: any): CourseStatus | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return value as CourseStatus;
    }

    const str = String(value).trim();
    // Match by enum key names if backend sends "Draft", "Active", etc.
    if (CourseStatus[str as keyof typeof CourseStatus] !== undefined) {
      return CourseStatus[str as keyof typeof CourseStatus] as CourseStatus;
    }

    const num = Number(str);
    return isNaN(num) ? null : (num as CourseStatus);
  }

  /**
   * Normalizes targetUserType from API (string enum name or number) to TargetUserType enum value.
   */
  private normalizeTargetUserType(value: any): TargetUserType | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return value as TargetUserType;
    }

    const str = String(value).trim();
    // Map string enum names to numeric values
    const enumMap: { [key: string]: TargetUserType } = {
      'ForOurOrganization': TargetUserType.ForOurOrganization,
      'All': TargetUserType.All,
      'SpecificDepartments': TargetUserType.SpecificDepartments,
      'SpecificOrganizations': TargetUserType.SpecificOrganizations,
      'SpecificSegments': TargetUserType.SpecificSegments,
      'AllUsersOfOrganization': TargetUserType.AllUsersOfOrganization,
      'SpecificOrganizationSegment': TargetUserType.SpecificOrganizationSegment
    };

    if (enumMap[str] !== undefined) {
      return enumMap[str];
    }

    // Try to parse as number
    const num = Number(str);
    return isNaN(num) ? null : (num as TargetUserType);
  }

  /**
   * Normalizes course.category from API (string like "Onsite") to LocationCategory enum value.
   */
  private normalizeLocationCategory(value: any): LocationCategory | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return value as LocationCategory;
    }

    const str = String(value).trim();

    // Exact matches for API strings
    if (str === 'Onsite') {
      return LocationCategory.Onsite;
    }
    if (str === 'Online') {
      return LocationCategory.Online;
    }
    if (str === 'OutSite') {
      return LocationCategory.OutSite;
    }
    if (str === 'Abroad') {
      return LocationCategory.Abroad;
    }

    // Case-insensitive fallback
    const lower = str.toLowerCase();
    if (lower === 'onsite' || lower === 'on-site') {
      return LocationCategory.Onsite;
    }
    if (lower === 'online') {
      return LocationCategory.Online;
    }
    if (lower === 'outsite' || lower === 'out-site' || lower === 'out site') {
      return LocationCategory.OutSite;
    }
    if (lower === 'abroad') {
      return LocationCategory.Abroad;
    }

    const num = Number(str);
    return isNaN(num) ? null : (num as LocationCategory);
  }

  /**
   * Generates a course code from the course tab's English name with a random suffix
   * Format: {COURSETABNAME}{RANDOM4DIGITS}
   * Example: "Safety Training" -> "SAFETYTRAINING1234"
   */
  private generateCodeFromCourseTabName(name: string): string {
    if (!name) return '';
    
    // Convert to uppercase, remove spaces and special characters, keep only alphanumeric
    let code = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') // Remove all non-alphanumeric characters
      .trim();
    
    // If empty after cleaning, use a fallback
    if (!code) {
      code = 'COURSE';
    }
    
    // Generate random 4-digit number (1000-9999)
    const randomNumber = Math.floor(Math.random() * 9000) + 1000;
    
    // Combine course tab name with random number
    return `${code}${randomNumber}`;
  }

  patchFormWithCourse(course: Course): void {
    this.form.patchValue({
      code: course.code,
      courseTitle: course.courseTitle,
      courseTitleAr: course.courseTitleAr || '',
      description: course.description || '',
      descriptionAr: course.descriptionAr || '',
      // Normalize enum-like fields: backend may send string names, we map them to numeric enums
      language: this.normalizeCourseLanguage(course.language),
      status: this.normalizeCourseStatus(course.status),
      category: this.normalizeLocationCategory(course.category),
      locationId: course.locationId,
      // Show date/time in local time in datetime-local input format (YYYY-MM-DDTHH:mm)
      startDateTime: course.startDateTime ? this.toLocalInputDateTime(course.startDateTime) : null,
      endDateTime: course.endDateTime ? this.toLocalInputDateTime(course.endDateTime) : null,
      availableSeats: course.availableSeats,
      availableOnlineSeats: course.availableOnlineSeats ?? 0,
      price: course.price,
      kpiWeight: course.kpiWeight,
      digitLibraryAvailability: course.digitLibraryAvailability,
      certificateAvailable: course.certificateAvailable,
      courseTabId: course.courseTabId,
      organizationId: course.organizationId,
      instructorIds: course.instructorIds || [],
      targetUserType: this.normalizeTargetUserType(course.targetUserType),
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
      
      // Ensure selectedOrganization is set before loading target user data
      if (!this.selectedOrganization && this.organizations.length > 0) {
        this.selectedOrganization = this.organizations.find(org => org.id === course.organizationId);
      }
      if (!this.selectedOrganization && course.organization) {
        this.selectedOrganization = course.organization;
      }
      if (this.selectedOrganization) {
        this.isMainOrg = this.selectedOrganization.isMain === true;
      }
      
      // Load target user data based on target user type
      const targetUserType = this.form.get('targetUserType')?.value;
      if (targetUserType !== null && targetUserType !== undefined) {
        // Use setTimeout to ensure form is fully patched and organization is set
        setTimeout(() => {
          this.loadDataForTargetUserType(targetUserType, course.organizationId);
          this.cdr.detectChanges();
        }, 300);
      } else {
        // If no target user type, load departments and segments for the organization
      if (this.selectedOrganization?.isMain) {
        this.loadDepartments(course.organizationId);
        this.loadSegments(course.organizationId);
      } else {
        // Load segments for non-main organizations too
        this.loadSegments(course.organizationId);
        }
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
          // If course tab is already selected and we're in add mode, generate code
          if (!this.isEdit) {
            const selectedTabId = this.form.get('courseTabId')?.value;
            if (selectedTabId) {
              this.generateCodeForCourseTab(selectedTabId);
            }
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading course tabs:', error);
        },
      });
    } else {
      // Course tabs already loaded, check if we need to generate code
      if (!this.isEdit) {
        const selectedTabId = this.form.get('courseTabId')?.value;
        if (selectedTabId) {
          this.generateCodeForCourseTab(selectedTabId);
        }
      }
    }
  }

  /**
   * Generates code for a selected course tab (only in add mode)
   */
  private generateCodeForCourseTab(courseTabId: number | null): void {
    if (!courseTabId || this.isEdit) return;
    
    const selectedTab = this.courseTabs.find(tab => tab.id === courseTabId);
    if (selectedTab && selectedTab.name) {
      const generatedCode = this.generateCodeFromCourseTabName(selectedTab.name);
      // Only auto-fill if code is empty or was previously auto-generated
      const currentCode = this.form.get('code')?.value;
      if (!currentCode || currentCode === this.lastGeneratedCode) {
        this.form.patchValue({ code: generatedCode });
        this.lastGeneratedCode = generatedCode;
      }
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
        this.form.get('organizationId')?.disable({ emitEvent: false });
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
                  this.form.get('organizationId')?.disable({ emitEvent: false });
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
    const filterCategory = this.getCategoryFilterString();

    this.locationService.getLocations(1, 1000, undefined, organizationId, filterCategory).subscribe({
      next: (response) => {
        // Filter for active, non-deleted locations
        this.locations = (response.result || []).filter(loc => loc.isActive && !loc.isDeleted);
        // Backend already filtered by organization and category (if provided)
        this.filteredLocations = [...this.locations];
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

  /**
   * Returns the backend filterCategory string based on the selected category enum
   * API expects strings like "Onsite", "Online", "OutSite", "Abroad"
   */
  private getCategoryFilterString(): string | undefined {
    const category = this.form.get('category')?.value;
    if (category === null || category === undefined || category === '') {
      return undefined;
    }
    
    // Category may be number or string representation of the enum value
    const value = typeof category === 'string' ? Number(category) : category;

    switch (value) {
      case LocationCategory.Onsite:
        return 'Onsite';
      case LocationCategory.Online:
        return 'Online';
      case LocationCategory.OutSite:
        return 'OutSite';
      case LocationCategory.Abroad:
        return 'Abroad';
      default:
        return undefined;
    }
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
    // Determine main/non-main strictly from the organizations list used in this popup.
    // This ensures Add Course and Edit Course behave consistently.
    const rawOrgId = this.form.get('organizationId')?.value;
    if (rawOrgId === null || rawOrgId === undefined || rawOrgId === '' || !this.organizations || this.organizations.length === 0) {
      return false;
    }

    // organizationId from the form can be a string; normalize to number for comparison
    const orgId = typeof rawOrgId === 'string' ? Number(rawOrgId) : rawOrgId;
    if (isNaN(orgId)) {
      return false;
    }

    const org = this.organizations.find(o => Number(o.id) === Number(orgId));
    if (org) {
      // Keep selectedOrganization in sync for other logic that relies on it.
      this.selectedOrganization = org;
      this.isMainOrg = org.isMain === true;
      return org.isMain === true;
    }
    
    return false;
  }
  
  
  get showDepartmentSelection(): boolean {
    if (!this.isMainOrganization) return false;
    const targetUserType = this.form.get('targetUserType')?.value;
    if (targetUserType === null || targetUserType === undefined) return false;
    const normalizedType = this.normalizeTargetUserType(targetUserType);
    return normalizedType === TargetUserType.SpecificDepartments;
  }
  
  get showOrganizationSelection(): boolean {
    if (!this.isMainOrganization) return false;
    const targetUserType = this.form.get('targetUserType')?.value;
    if (targetUserType === null || targetUserType === undefined) return false;
    const normalizedType = this.normalizeTargetUserType(targetUserType);
    return normalizedType === TargetUserType.SpecificOrganizations;
  }
  
  get showSegmentSelection(): boolean {
    const targetUserType = this.form.get('targetUserType')?.value;
    if (targetUserType === null || targetUserType === undefined) return false;
    const normalizedType = this.normalizeTargetUserType(targetUserType);
    if (this.isMainOrganization) {
      return normalizedType === TargetUserType.SpecificSegments;
    } else {
      return normalizedType === TargetUserType.SpecificOrganizationSegment;
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

    // Format dates for API - convert to local time string (not UTC)
    if (formData.startDateTime) {
      formData.startDateTime = this.formatLocalDateTime(formData.startDateTime);
    }
    if (formData.endDateTime) {
      formData.endDateTime = this.formatLocalDateTime(formData.endDateTime);
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

    // Ensure availableOnlineSeats is a non-negative number
    if (formData.availableOnlineSeats === null || formData.availableOnlineSeats === undefined) {
      formData.availableOnlineSeats = 0;
    } else {
      formData.availableOnlineSeats = Number(formData.availableOnlineSeats) || 0;
    }

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
