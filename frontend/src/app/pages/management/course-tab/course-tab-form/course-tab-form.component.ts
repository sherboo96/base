import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CourseTabService } from '../../../../services/course-tab.service';
import { ToastrService } from 'ngx-toastr';
import { DialogRef } from '@ngneat/dialog';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-course-tab-form',
  templateUrl: './course-tab-form.component.html',
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
export class CourseTabFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isSubmitting = false;
  organizations: any[] = [];
  selectedOrganization: any = null;
  availableIcons: { value: string; label: string; preview: string; isMaterialIcon: boolean }[] = [
    // Material Icons - Education
    { value: 'material-icons book', label: 'Book', preview: 'book', isMaterialIcon: true },
    { value: 'material-icons school', label: 'School', preview: 'school', isMaterialIcon: true },
    { value: 'material-icons menu_book', label: 'Menu Book', preview: 'menu_book', isMaterialIcon: true },
    { value: 'material-icons library_books', label: 'Library Books', preview: 'library_books', isMaterialIcon: true },
    { value: 'material-icons class', label: 'Class', preview: 'class', isMaterialIcon: true },
    { value: 'material-icons assignment', label: 'Assignment', preview: 'assignment', isMaterialIcon: true },
    { value: 'material-icons quiz', label: 'Quiz', preview: 'quiz', isMaterialIcon: true },
    { value: 'material-icons description', label: 'Description', preview: 'description', isMaterialIcon: true },
    { value: 'material-icons folder', label: 'Folder', preview: 'folder', isMaterialIcon: true },
    { value: 'material-icons dashboard', label: 'Dashboard', preview: 'dashboard', isMaterialIcon: true },
    { value: 'material-icons computer', label: 'Computer', preview: 'computer', isMaterialIcon: true },
    { value: 'material-icons code', label: 'Code', preview: 'code', isMaterialIcon: true },
    { value: 'material-icons cloud', label: 'Cloud', preview: 'cloud', isMaterialIcon: true },
    { value: 'material-icons storage', label: 'Storage', preview: 'storage', isMaterialIcon: true },
    { value: 'material-icons security', label: 'Security', preview: 'security', isMaterialIcon: true },
    { value: 'material-icons business', label: 'Business', preview: 'business', isMaterialIcon: true },
    { value: 'material-icons work', label: 'Work', preview: 'work', isMaterialIcon: true },
    { value: 'material-icons group', label: 'Group', preview: 'group', isMaterialIcon: true },
    { value: 'material-icons video_library', label: 'Video Library', preview: 'video_library', isMaterialIcon: true },
    { value: 'material-icons language', label: 'Language', preview: 'language', isMaterialIcon: true },
    
    // Font Awesome - Education & General
    { value: 'fas fa-book', label: 'Book', preview: 'fas fa-book', isMaterialIcon: false },
    { value: 'fas fa-graduation-cap', label: 'Graduation Cap', preview: 'fas fa-graduation-cap', isMaterialIcon: false },
    { value: 'fas fa-chalkboard-teacher', label: 'Chalkboard', preview: 'fas fa-chalkboard-teacher', isMaterialIcon: false },
    { value: 'fas fa-certificate', label: 'Certificate', preview: 'fas fa-certificate', isMaterialIcon: false },
    { value: 'fas fa-laptop', label: 'Laptop', preview: 'fas fa-laptop', isMaterialIcon: false },
    { value: 'fas fa-desktop', label: 'Desktop', preview: 'fas fa-desktop', isMaterialIcon: false },
    { value: 'fas fa-code', label: 'Code', preview: 'fas fa-code', isMaterialIcon: false },
    { value: 'fas fa-cloud', label: 'Cloud', preview: 'fas fa-cloud', isMaterialIcon: false },
    { value: 'fas fa-database', label: 'Database', preview: 'fas fa-database', isMaterialIcon: false },
    { value: 'fas fa-server', label: 'Server', preview: 'fas fa-server', isMaterialIcon: false },
    { value: 'fas fa-network-wired', label: 'Network', preview: 'fas fa-network-wired', isMaterialIcon: false },
    { value: 'fas fa-shield-alt', label: 'Security', preview: 'fas fa-shield-alt', isMaterialIcon: false },
    { value: 'fas fa-users', label: 'Users', preview: 'fas fa-users', isMaterialIcon: false },
    { value: 'fas fa-user-tie', label: 'Professional', preview: 'fas fa-user-tie', isMaterialIcon: false },
    { value: 'fas fa-briefcase', label: 'Briefcase', preview: 'fas fa-briefcase', isMaterialIcon: false },
    { value: 'fas fa-building', label: 'Building', preview: 'fas fa-building', isMaterialIcon: false },
    { value: 'fas fa-video', label: 'Video', preview: 'fas fa-video', isMaterialIcon: false },
    { value: 'fas fa-globe', label: 'Globe', preview: 'fas fa-globe', isMaterialIcon: false },
    { value: 'fas fa-rocket', label: 'Rocket', preview: 'fas fa-rocket', isMaterialIcon: false },
    { value: 'fas fa-lightbulb', label: 'Lightbulb', preview: 'fas fa-lightbulb', isMaterialIcon: false },
    
    // Font Awesome Brands - International Companies
    { value: 'fab fa-google', label: 'Google', preview: 'fab fa-google', isMaterialIcon: false },
    { value: 'fab fa-microsoft', label: 'Microsoft', preview: 'fab fa-microsoft', isMaterialIcon: false },
    { value: 'fab fa-meta', label: 'Meta (Facebook)', preview: 'fab fa-meta', isMaterialIcon: false },
    { value: 'fab fa-apple', label: 'Apple', preview: 'fab fa-apple', isMaterialIcon: false },
    { value: 'fab fa-amazon', label: 'Amazon', preview: 'fab fa-amazon', isMaterialIcon: false },
    { value: 'fab fa-aws', label: 'AWS', preview: 'fab fa-aws', isMaterialIcon: false },
    { value: 'fab fa-ibm', label: 'IBM', preview: 'fab fa-ibm', isMaterialIcon: false },
    { value: 'fab fa-oracle', label: 'Oracle', preview: 'fab fa-oracle', isMaterialIcon: false },
    { value: 'fab fa-salesforce', label: 'Salesforce', preview: 'fab fa-salesforce', isMaterialIcon: false },
    { value: 'fab fa-adobe', label: 'Adobe', preview: 'fab fa-adobe', isMaterialIcon: false },
    { value: 'fab fa-cisco', label: 'Cisco', preview: 'fab fa-cisco', isMaterialIcon: false },
    { value: 'fab fa-dell', label: 'Dell', preview: 'fab fa-dell', isMaterialIcon: false },
    { value: 'fab fa-hp', label: 'HP', preview: 'fab fa-hp', isMaterialIcon: false },
    { value: 'fab fa-intel', label: 'Intel', preview: 'fab fa-intel', isMaterialIcon: false },
    { value: 'fab fa-nvidia', label: 'NVIDIA', preview: 'fab fa-nvidia', isMaterialIcon: false },
    { value: 'fab fa-redhat', label: 'Red Hat', preview: 'fab fa-redhat', isMaterialIcon: false },
    { value: 'fab fa-sap', label: 'SAP', preview: 'fab fa-sap', isMaterialIcon: false },
    { value: 'fab fa-vmware', label: 'VMware', preview: 'fab fa-vmware', isMaterialIcon: false },
    { value: 'fab fa-github', label: 'GitHub', preview: 'fab fa-github', isMaterialIcon: false },
    { value: 'fab fa-gitlab', label: 'GitLab', preview: 'fab fa-gitlab', isMaterialIcon: false },
    { value: 'fab fa-bitbucket', label: 'Bitbucket', preview: 'fab fa-bitbucket', isMaterialIcon: false },
    { value: 'fab fa-docker', label: 'Docker', preview: 'fab fa-docker', isMaterialIcon: false },
    { value: 'fab fa-kubernetes', label: 'Kubernetes', preview: 'fab fa-kubernetes', isMaterialIcon: false },
    { value: 'fab fa-linux', label: 'Linux', preview: 'fab fa-linux', isMaterialIcon: false },
    { value: 'fab fa-ubuntu', label: 'Ubuntu', preview: 'fab fa-ubuntu', isMaterialIcon: false },
    { value: 'fab fa-windows', label: 'Windows', preview: 'fab fa-windows', isMaterialIcon: false },
    { value: 'fab fa-android', label: 'Android', preview: 'fab fa-android', isMaterialIcon: false },
    { value: 'fab fa-react', label: 'React', preview: 'fab fa-react', isMaterialIcon: false },
    { value: 'fab fa-angular', label: 'Angular', preview: 'fab fa-angular', isMaterialIcon: false },
    { value: 'fab fa-vue', label: 'Vue.js', preview: 'fab fa-vue', isMaterialIcon: false },
    { value: 'fab fa-node-js', label: 'Node.js', preview: 'fab fa-node-js', isMaterialIcon: false },
    { value: 'fab fa-python', label: 'Python', preview: 'fab fa-python', isMaterialIcon: false },
    { value: 'fab fa-java', label: 'Java', preview: 'fab fa-java', isMaterialIcon: false },
    { value: 'fab fa-js', label: 'JavaScript', preview: 'fab fa-js', isMaterialIcon: false },
    { value: 'fab fa-html5', label: 'HTML5', preview: 'fab fa-html5', isMaterialIcon: false },
    { value: 'fab fa-css3-alt', label: 'CSS3', preview: 'fab fa-css3-alt', isMaterialIcon: false },
    { value: 'fab fa-php', label: 'PHP', preview: 'fab fa-php', isMaterialIcon: false },
    { value: 'fab fa-laravel', label: 'Laravel', preview: 'fab fa-laravel', isMaterialIcon: false },
    { value: 'fab fa-wordpress', label: 'WordPress', preview: 'fab fa-wordpress', isMaterialIcon: false },
    { value: 'fab fa-shopify', label: 'Shopify', preview: 'fab fa-shopify', isMaterialIcon: false },
    { value: 'fab fa-magento', label: 'Magento', preview: 'fab fa-magento', isMaterialIcon: false },
    { value: 'fab fa-paypal', label: 'PayPal', preview: 'fab fa-paypal', isMaterialIcon: false },
    { value: 'fab fa-stripe', label: 'Stripe', preview: 'fab fa-stripe', isMaterialIcon: false },
    { value: 'fab fa-linkedin', label: 'LinkedIn', preview: 'fab fa-linkedin', isMaterialIcon: false },
    { value: 'fab fa-twitter', label: 'Twitter', preview: 'fab fa-twitter', isMaterialIcon: false },
    { value: 'fab fa-youtube', label: 'YouTube', preview: 'fab fa-youtube', isMaterialIcon: false },
    { value: 'fab fa-slack', label: 'Slack', preview: 'fab fa-slack', isMaterialIcon: false },
    { value: 'fab fa-teamspeak', label: 'Teamspeak', preview: 'fab fa-teamspeak', isMaterialIcon: false },
    { value: 'fab fa-discord', label: 'Discord', preview: 'fab fa-discord', isMaterialIcon: false },
    { value: 'fab fa-telegram', label: 'Telegram', preview: 'fab fa-telegram', isMaterialIcon: false },
    { value: 'fab fa-whatsapp', label: 'WhatsApp', preview: 'fab fa-whatsapp', isMaterialIcon: false },
  ];

  constructor(
    private fb: FormBuilder,
    private courseTabService: CourseTabService,
    private toastr: ToastrService,
    private dialogRef: DialogRef<{ courseTab?: any; organizations?: any[] }>,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      nameAr: [''],
      routeCode: ['', Validators.required],
      icon: ['material-icons book'],
      excuseTimeHours: [null],
      organizationId: [null, Validators.required],
      showInMenu: [true],
      showPublic: [false],
      showForOtherOrganizations: [false],
      showDigitalLibraryInMenu: [false],
      showDigitalLibraryPublic: [false],
    });

    if (this.dialogRef.data?.courseTab) {
      this.isEdit = true;
      const courseTab = this.dialogRef.data.courseTab;
      this.form.patchValue({
        name: courseTab.name,
        nameAr: courseTab.nameAr || '',
        routeCode: courseTab.routeCode || '',
        icon: courseTab.icon || 'material-icons book',
        excuseTimeHours: courseTab.excuseTimeHours || null,
        organizationId: courseTab.organizationId,
        showInMenu: courseTab.showInMenu ?? true,
        showPublic: courseTab.showPublic ?? false,
        showForOtherOrganizations: courseTab.showForOtherOrganizations ?? false,
        showDigitalLibraryInMenu: courseTab.showDigitalLibraryInMenu ?? false,
        showDigitalLibraryPublic: courseTab.showDigitalLibraryPublic ?? false,
      });
      // Set selected organization for conditional display
      if (this.dialogRef.data?.organizations) {
        this.selectedOrganization = this.dialogRef.data.organizations.find((org: any) => org.id === courseTab.organizationId);
      }
    }

    if (this.dialogRef.data?.organizations) {
      this.organizations = this.dialogRef.data.organizations;
    }
    
    // Watch organization changes to update selectedOrganization
    this.form.get('organizationId')?.valueChanges.subscribe(orgId => {
      if (orgId && this.organizations.length > 0) {
        this.selectedOrganization = this.organizations.find((org: any) => org.id === orgId);
        // Clear showForOtherOrganizations if organization is not main
        if (!this.selectedOrganization?.isMain) {
          this.form.patchValue({ showForOtherOrganizations: false });
        }
      } else {
        this.selectedOrganization = null;
        this.form.patchValue({ showForOtherOrganizations: false });
      }
    });
  }

  ngOnInit(): void {
    // Set initial selectedOrganization if organizationId is already set
    const orgId = this.form.get('organizationId')?.value;
    if (orgId && this.organizations.length > 0) {
      this.selectedOrganization = this.organizations.find((org: any) => org.id === orgId);
    }
  }
  
  get isMainOrganization(): boolean {
    return this.selectedOrganization?.isMain === true;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastr.error(this.translationService.instant('courseTab.formInvalid'));
      return;
    }

    this.isSubmitting = true;
    const formData = { ...this.form.value };

    if (this.isEdit) {
      const courseTabId = this.dialogRef.data.courseTab.id;
      this.courseTabService.updateCourseTab(courseTabId, formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('courseTab.updateSuccess'));
          this.dialogRef.close(true);
          this.isSubmitting = false;
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('courseTab.updateError')
          );
          this.isSubmitting = false;
        },
      });
    } else {
      this.courseTabService.createCourseTab(formData).subscribe({
        next: () => {
          this.toastr.success(this.translationService.instant('courseTab.createSuccess'));
          this.dialogRef.close(true);
          this.isSubmitting = false;
        },
        error: (error) => {
          this.toastr.error(
            error.error?.message || this.translationService.instant('courseTab.createError')
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
