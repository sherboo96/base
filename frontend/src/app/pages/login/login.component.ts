import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { ValidatorService } from '../../services/validator.service';
import { UserService } from '../../services/user.service';
import { StorageService } from '../../services/storage.service';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';
import { TranslationService } from '../../services/translation.service';
import { LoadingComponent } from '../../components/loading/loading.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastrModule, TranslateModule, LanguageSwitcherComponent, LoadingComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  registrationForm!: FormGroup;
  formSubmitted = false;
  registrationFormSubmitted = false;
  currentLang: 'en' | 'ar' = 'en';
  isOtpMode = false;
  otpSent = false;
  otpRequesting = false;
  loginMethodChecked = false; // Track if login method has been checked
  isRegistrationMode = false; // Toggle between login and registration
  registrationOtpSent = false; // Track if OTP was sent after registration
  registrationEmail = ''; // Store email for OTP verification
  showRegistrationOtpVerification = false; // Show OTP verification form after registration

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private fb: FormBuilder,
    private validatorService: ValidatorService,
    private userService: UserService,
    private storageService: StorageService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.initForm();

    // Get current language
    this.currentLang = this.translationService.getCurrentLanguage() as 'en' | 'ar';
    this.translationService.currentLang$.subscribe(lang => {
      this.currentLang = lang as 'en' | 'ar';
    });

    // Check if "Remember Me" was previously selected
    const savedUsername = localStorage.getItem('username');
    const rememberMe = localStorage.getItem('rememberMe');

    if (rememberMe === 'true' && savedUsername) {
      this.loginForm.patchValue({
        username: savedUsername,
        rememberMe: true,
      });
    }
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          this.validatorService.usernameFormat(),
        ],
      ],
      password: ['', []], // Validators will be set based on mode
      otp: ['', []], // Validators will be set based on mode
      rememberMe: [false],
    });

    this.registrationForm = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
        ],
      ],
      fullName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
        ],
      ],
      fullNameAr: [
        '',
        [
          Validators.minLength(3),
        ],
      ],
      civilNo: [
        '',
        [],
      ],
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          this.validatorService.usernameFormat(),
        ],
      ],
      registrationOtp: [
        '',
        [
          Validators.minLength(6),
          Validators.maxLength(6),
        ],
      ],
    });
  }

  updateFormValidators(): void {
    if (this.isOtpMode) {
      // OTP mode: require OTP, not password
      this.loginForm.get('otp')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
      this.loginForm.get('password')?.clearValidators();
    } else {
      // Password mode: require password, not OTP
      this.loginForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.loginForm.get('otp')?.clearValidators();
    }
    this.loginForm.get('password')?.updateValueAndValidity();
    this.loginForm.get('otp')?.updateValueAndValidity();
  }

  // Getter methods for easy access to form controls
  get usernameControl() {
    return this.loginForm.get('username');
  }
  get passwordControl() {
    return this.loginForm.get('password');
  }
  get rememberMeControl() {
    return this.loginForm.get('rememberMe');
  }
  get otpControl() {
    return this.loginForm.get('otp');
  }

  // Check if a field has errors and has been touched or form was submitted
  hasError(controlName: string): boolean {
    const form = this.isRegistrationMode ? this.registrationForm : this.loginForm;
    const control = form.get(controlName);
    const submitted = this.isRegistrationMode ? this.registrationFormSubmitted : this.formSubmitted;
    return (
      !!control && control.invalid && (control.touched || submitted)
    );
  }

  // Get error message for a specific field
  getErrorMessage(controlName: string): string {
    const form = this.isRegistrationMode ? this.registrationForm : this.loginForm;
    const control = form.get(controlName);
    return this.validatorService.getErrorMessage(control);
  }

  // Check if form is valid based on current mode
  isFormValid(): boolean {
    const usernameValid = this.loginForm.get('username')?.valid;
    
    if (!usernameValid) {
      return false;
    }

    if (this.isOtpMode) {
      return this.loginForm.get('otp')?.valid || false;
    } else {
      return this.loginForm.get('password')?.valid || false;
    }
  }

  checkUserLoginMethod() {
    const username = this.loginForm.get('username')?.value;
    if (!username || username.length < 3 || this.loginForm.get('username')?.invalid) {
      // Reset to password mode if username is invalid
      this.isOtpMode = false;
      this.otpSent = false;
      this.loginMethodChecked = false;
      this.updateFormValidators();
      return;
    }

    // Check if user exists and get login method
    this.loadingService.show();
    this.authService.checkLoginMethod(username).subscribe({
      next: (response) => {
        this.loadingService.hide();
        if (response.result) {
          const loginMethodId = response.result.loginMethod?.id;
          const isEnabled = response.result.isEnabled;

          if (!isEnabled) {
            this.toastr.warning(
              this.translationService.instant('login.loginMethodDisabled')
            );
            this.isOtpMode = false;
            this.otpSent = false;
            return;
          }

          // Mark that login method has been checked
          this.loginMethodChecked = true;

          // LoginMethod.KMNID = 1 (OTP Verification)
          if (loginMethodId === 1) {
            this.isOtpMode = true;
            // Auto-request OTP if email is available
            if (response.result.email) {
              this.requestOtp();
            }
          } else {
            // Credentials (3) or ActiveDirectory (2)
            this.isOtpMode = false;
            this.otpSent = false;
          }
          
          // Update form validators based on mode
          this.updateFormValidators();
        }
      },
      error: (error) => {
        this.loadingService.hide();
        // If user not found, reset to password mode
        if (error.error?.statusCode === 404) {
          this.isOtpMode = false;
          this.otpSent = false;
          this.loginMethodChecked = false;
          this.updateFormValidators();
        } else {
          // For other errors, show message but keep current mode
          console.error('Error checking login method:', error);
          this.loginMethodChecked = false;
          this.updateFormValidators();
        }
      },
    });
  }

  requestOtp() {
    const username = this.loginForm.get('username')?.value;
    if (!username) {
      this.toastr.warning(this.translationService.instant('login.usernameRequired'));
      return;
    }

    this.otpRequesting = true;
    this.authService.requestOtp(username).subscribe({
      next: (response) => {
        this.otpSent = true;
        this.isOtpMode = true;
        this.toastr.success(response.message || this.translationService.instant('login.otpSent'));
        this.otpRequesting = false;
      },
      error: (error) => {
        const errorMessage = error.error?.message || this.translationService.instant('login.otpRequestError');
        this.toastr.error(errorMessage);
        this.otpRequesting = false;
      },
    });
  }

  onLogin() {
    this.formSubmitted = true;

    // Validate based on mode
    if (this.isOtpMode) {
      if (!this.loginForm.get('otp')?.valid) {
        this.loginForm.get('otp')?.markAsTouched();
        this.toastr.warning(this.translationService.instant('login.otpRequired'));
        return;
      }
    } else {
      if (this.loginForm.get('password')?.invalid) {
        this.loginForm.get('password')?.markAsTouched();
        this.toastr.warning(this.translationService.instant('login.passwordRequired'));
        return;
      }
    }

    if (this.loginForm.get('username')?.invalid) {
      this.loginForm.get('username')?.markAsTouched();
      this.toastr.warning(this.translationService.instant('login.usernameRequired'));
      return;
    }

    const { username, password, otp, rememberMe } = this.loginForm.value;
    const loginPassword = this.isOtpMode ? otp : password;

    // Show loading immediately when login button is clicked
    this.loadingService.show();

    this.authService.login({ username, password: loginPassword }).subscribe({
      next: (response) => {
        if (rememberMe) {
          localStorage.setItem('username', username);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('username');
          localStorage.removeItem('rememberMe');
        }

        // Store user roles
        if (response.result.roles && response.result.roles.length > 0) {
          this.storageService.setItem('userRoles', response.result.roles);
        }

        // Fetch and store user permissions (AuthService handles storage automatically)
        this.authService.getUserPermissions().subscribe({
          next: () => {
            this.toastr.success(this.translationService.instant('login.loginSuccessful'));
            this.router.navigate(['/dashboard']);
            this.loadingService.hide();
          },
          error: (permissionsError) => {
            console.error('Error fetching permissions:', permissionsError);
            // Still proceed with login even if permissions fetch fails
            this.toastr.success(this.translationService.instant('login.loginSuccessful'));
            this.router.navigate(['/dashboard']);
            this.loadingService.hide();
          },
        });
      },
      error: (error) => {
        // Show backend error message if available
        const errorMessage = error.error?.message || this.translationService.instant('login.invalidCredentials');
        this.toastr.error(errorMessage);
        this.formSubmitted = false;
        // Hide loading
        this.loadingService.hide();
      },
    });
  }

  toggleMode() {
    this.isRegistrationMode = !this.isRegistrationMode;
    this.formSubmitted = false;
    this.registrationFormSubmitted = false;
    this.isOtpMode = false;
    this.otpSent = false;
    this.loginMethodChecked = false;
    this.showRegistrationOtpVerification = false;
    this.registrationOtpSent = false;
    this.registrationEmail = '';
    // Clear OTP validators when switching modes
    this.registrationForm.get('registrationOtp')?.clearValidators();
    this.registrationForm.get('registrationOtp')?.updateValueAndValidity();
  }

  onRegister() {
    this.registrationFormSubmitted = true;

    if (this.registrationForm.invalid) {
      this.toastr.warning(this.translationService.instant('registration.formInvalid'));
      return;
    }

    const { email, fullName, fullNameAr, civilNo, username } = this.registrationForm.value;

    this.loadingService.show();

    this.authService.register({ email, fullName, fullNameAr, civilNo, username }).subscribe({
      next: (response) => {
        this.loadingService.hide();
        if (response.statusCode === 200) {
          this.toastr.success(response.message || this.translationService.instant('registration.success'));
          // Show OTP verification form instead of switching to login
          this.registrationOtpSent = true;
          this.registrationEmail = email;
          this.showRegistrationOtpVerification = true;
          // Clear OTP field and set validators
          this.registrationForm.get('registrationOtp')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
          this.registrationForm.get('registrationOtp')?.updateValueAndValidity();
        } else {
          this.toastr.error(response.message || this.translationService.instant('registration.error'));
        }
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error.error?.message || this.translationService.instant('registration.error');
        this.toastr.error(errorMessage);
      },
    });
  }

  onVerifyRegistrationOtp() {
    const otp = this.registrationForm.get('registrationOtp')?.value;
    if (!otp || otp.length !== 6) {
      this.toastr.warning(this.translationService.instant('registration.otpRequired'));
      return;
    }

    this.loadingService.show();

    this.authService.verifyRegistrationOtp(this.registrationEmail, otp).subscribe({
      next: (response) => {
        this.loadingService.hide();
        if (response.statusCode === 200) {
          this.toastr.success(response.message || this.translationService.instant('registration.verificationSuccess'));
          // Switch to login mode after successful verification
          this.showRegistrationOtpVerification = false;
          this.isRegistrationMode = false;
          this.registrationOtpSent = false;
          // Pre-fill username in login form
          const username = this.registrationForm.get('username')?.value;
          this.loginForm.patchValue({ username });
          // Reset registration form
          this.registrationForm.reset();
        } else {
          this.toastr.error(response.message || this.translationService.instant('registration.verificationError'));
        }
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error.error?.message || this.translationService.instant('registration.verificationError');
        this.toastr.error(errorMessage);
      },
    });
  }

  resendRegistrationOtp() {
    this.loadingService.show();
    this.authService.requestOtp(this.registrationEmail).subscribe({
      next: (response) => {
        this.loadingService.hide();
        this.toastr.success(response.message || this.translationService.instant('login.otpSent'));
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error.error?.message || this.translationService.instant('login.otpRequestError');
        this.toastr.error(errorMessage);
      },
    });
  }

  // Getter methods for registration form
  get emailControl() {
    return this.registrationForm.get('email');
  }
  get fullNameControl() {
    return this.registrationForm.get('fullName');
  }
  get fullNameArControl() {
    return this.registrationForm.get('fullNameAr');
  }
  get civilNoControl() {
    return this.registrationForm.get('civilNo');
  }
  get registrationUsernameControl() {
    return this.registrationForm.get('username');
  }
  get registrationOtpControl() {
    return this.registrationForm.get('registrationOtp');
  }

  // Check if registration form is valid
  isRegistrationFormValid(): boolean {
    if (this.showRegistrationOtpVerification) {
      // When showing OTP verification, only OTP field needs to be valid
      return this.registrationForm.get('registrationOtp')?.valid || false;
    }
    // Otherwise, check all registration fields except OTP
    const emailValid = this.registrationForm.get('email')?.valid;
    const fullNameValid = this.registrationForm.get('fullName')?.valid;
    const usernameValid = this.registrationForm.get('username')?.valid;
    return !!(emailValid && fullNameValid && usernameValid);
  }

  // Check if registration OTP verification form is valid
  isRegistrationOtpValid(): boolean {
    return this.registrationForm.get('registrationOtp')?.valid || false;
  }
}
