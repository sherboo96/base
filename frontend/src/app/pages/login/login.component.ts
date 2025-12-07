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

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  formSubmitted = false;
  maxLoginAttempts = 3;
  loginAttempts = 0;
  isAccountLocked = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private fb: FormBuilder,
    private validatorService: ValidatorService,
    private userService: UserService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.checkPreviousLoginAttempts();

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
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  checkPreviousLoginAttempts(): void {
    const attempts = localStorage.getItem('loginAttempts');
    const lockTime = localStorage.getItem('accountLockTime');

    if (attempts) {
      this.loginAttempts = parseInt(attempts, 10);
    }

    if (lockTime) {
      const lockUntil = parseInt(lockTime, 10);
      const now = new Date().getTime();

      if (now < lockUntil) {
        const remainingMinutes = Math.ceil((lockUntil - now) / 60000);
        this.toastr.error(
          `Your account is locked. Please try again in ${remainingMinutes} minutes.`,
          'Account Locked'
        );
      } else {
        this.resetLoginAttempts();
      }
    }
  }

  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('accountLockTime');
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

  // Check if a field has errors and has been touched or form was submitted
  hasError(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return (
      !!control && control.invalid && (control.touched || this.formSubmitted)
    );
  }

  // Get error message for a specific field
  getErrorMessage(controlName: string): string {
    const control = this.loginForm.get(controlName);
    return this.validatorService.getErrorMessage(control);
  }

  onLogin() {
    this.formSubmitted = true;

    if (this.isAccountLocked) {
      this.toastr.error(
        'Your account is locked. Please try again later.',
        'Account Locked'
      );
      return;
    }

    if (this.loginForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach((key) => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
      this.toastr.warning('Please check the form for errors', 'Form Invalid');
      return;
    }

    const { username, password, rememberMe } = this.loginForm.value;

    // Show loading
    this.loadingService.show();

    this.authService.login({ username, password }).subscribe({
      next: (response) => {
        // Reset login attempts on successful login
        this.resetLoginAttempts();

        if (rememberMe) {
          localStorage.setItem('username', username);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('username');
          localStorage.removeItem('rememberMe');
        }

        // Store user permissions from roles
        if (response.result.roles && response.result.roles.length > 0) {
          // Extract permissions from roles (if available in response)
          this.storageService.setItem(
            'userRoles',
            JSON.stringify(response.result.roles)
          );
        }

        this.toastr.success('Login successful!');
        this.router.navigate(['/dashboard']);
        this.loadingService.hide();
      },
      error: (error) => {
        // Increment login attempts
        this.loginAttempts++;
        localStorage.setItem('loginAttempts', this.loginAttempts.toString());

        // Check if max attempts reached
        if (this.loginAttempts >= this.maxLoginAttempts) {
          this.isAccountLocked = true;
          const lockUntil = new Date().getTime() + 1 * 60 * 1000; // 1 minute
          localStorage.setItem('accountLockTime', lockUntil.toString());
          this.toastr.error(error.error.message);
        } else {
          // Show backend error message if available
          const errorMessage = error.error?.message || 'Invalid credentials';
          this.toastr.error(errorMessage);
        }

        // Hide loading
        this.loadingService.hide();
      },
    });
  }
}
