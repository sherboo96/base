import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { DepartmentService } from '../../services/department.service';
import { JobTitleService } from '../../services/job-title.service';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from '../../services/loading.service';
import { TranslationService } from '../../services/translation.service';
import { LoadingComponent } from '../../components/loading/loading.component';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-profile-completion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent, TranslateModule],
  templateUrl: './profile-completion.component.html',
  styleUrl: './profile-completion.component.scss',
})
export class ProfileCompletionComponent implements OnInit {
  profileForm!: FormGroup;
  departments: any[] = [];
  jobTitles: any[] = [];
  currentUser: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private departmentService: DepartmentService,
    private jobTitleService: JobTitleService,
    private toastr: ToastrService,
    public loadingService: LoadingService,
    private translationService: TranslationService,
    private http: HttpClient,
    private storageService: StorageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCurrentUser();
    this.loadDepartments();
    this.loadJobTitles();
  }

  @HostListener('window:beforeunload', ['$event'])
  canDeactivate(event: BeforeUnloadEvent): boolean {
    // Always prevent page reload/navigation until profile is completed
    event.preventDefault();
    event.returnValue = this.translationService.instant('profileCompletion.warningMessage');
    return false;
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      fullNameAr: ['', [Validators.required, Validators.minLength(3)]],
      departmentId: [null, Validators.required],
      jobTitleId: [null, Validators.required],
    });
  }

  loadCurrentUser(): void {
    this.loadingService.show();
    const storedUser = this.storageService.getItem<any>('currentUser');
    
    if (storedUser?.id) {
      // User ID is a string in Identity framework
      this.userService.getUserById(storedUser.id).subscribe({
        next: (response) => {
          if (response.statusCode === 200 && response.result) {
            this.currentUser = response.result;
            // Pre-fill form if user has partial data
            this.profileForm.patchValue({
              fullName: response.result.fullName || '',
              fullNameAr: response.result.fullNameAr || '',
              departmentId: response.result.departmentId || response.result.position?.departmentId || null,
              jobTitleId: response.result.jobTitleId || response.result.position?.jobTitleId || null,
            });
          }
          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Error loading user:', error);
          // Pre-fill from stored user if API call fails
          if (storedUser) {
            this.profileForm.patchValue({
              fullName: storedUser.fullName || '',
              fullNameAr: storedUser.fullNameAr || '',
            });
          }
          this.loadingService.hide();
        },
      });
    } else {
      this.loadingService.hide();
    }
  }

  loadDepartments(): void {
    this.departmentService.getDepartments(1, 1000).subscribe({
      next: (response) => {
        console.log('Departments response:', response);
        if (response.statusCode === 200 && response.result) {
          this.departments = Array.isArray(response.result) ? response.result : [];
          console.log('Departments loaded:', this.departments.length);
          this.cdr.detectChanges();
        } else {
          console.warn('Unexpected response structure:', response);
        }
      },
      error: (error) => {
        console.error('Error loading departments:', error);
        this.toastr.error('Failed to load departments');
      },
    });
  }

  loadJobTitles(): void {
    this.jobTitleService.getJobTitles(1, 1000).subscribe({
      next: (response) => {
        console.log('Job titles response:', response);
        if (response.statusCode === 200 && response.result) {
          this.jobTitles = Array.isArray(response.result) ? response.result : [];
          console.log('Job titles loaded:', this.jobTitles.length);
          this.cdr.detectChanges();
        } else {
          console.warn('Unexpected response structure:', response);
        }
      },
      error: (error) => {
        console.error('Error loading job titles:', error);
        this.toastr.error('Failed to load job titles');
      },
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toastr.warning(this.translationService.instant('profileCompletion.fillAllFields'));
      return;
    }

    this.loadingService.show();
    const formData = this.profileForm.value;

    this.http
      .post(`${environment.baseUrl}/Authentications/complete-profile`, {
        departmentId: formData.departmentId,
        jobTitleId: formData.jobTitleId,
        fullName: formData.fullName.trim(),
        fullNameAr: formData.fullNameAr.trim(),
      })
      .subscribe({
        next: (response: any) => {
          if (response.statusCode === 200) {
            this.toastr.success(
              this.translationService.instant('profileCompletion.success')
            );
            // Reload user data and redirect to dashboard
            this.authService.getUserPermissions().subscribe({
              next: () => {
                this.router.navigate(['/dashboard'], { replaceUrl: true });
                this.loadingService.hide();
              },
              error: () => {
                this.router.navigate(['/dashboard'], { replaceUrl: true });
                this.loadingService.hide();
              },
            });
          } else {
            this.toastr.error(response.message || this.translationService.instant('profileCompletion.error'));
            this.loadingService.hide();
          }
        },
        error: (error) => {
          console.error('Error completing profile:', error);
          this.toastr.error(
            error.error?.message || this.translationService.instant('profileCompletion.error')
          );
          this.loadingService.hide();
        },
      });
  }

  hasError(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.profileForm.get(controlName);
    if (control?.hasError('required')) {
      return this.translationService.instant('common.thisFieldRequired');
    }
    if (control?.hasError('minlength')) {
      return this.translationService.instant('login.minimumLength', {
        min: control.errors?.['minlength']?.requiredLength,
      });
    }
    return '';
  }
}

