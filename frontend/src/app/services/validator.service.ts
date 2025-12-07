import { Injectable } from '@angular/core';
import {
  AbstractControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class ValidatorService {
  constructor() {}

  /**
   * Validator for required fields with whitespace check
   */
  public notBlank(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (
        !control.value ||
        !control.value.trim ||
        control.value.trim() === ''
      ) {
        return { required: true };
      }
      return null;
    };
  }

  /**
   * Validator for email format
   */
  public emailFormat(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const valid = regex.test(control.value);

      return valid ? null : { email: true };
    };
  }

  /**
   * Validator for password strength
   * Requires at least one uppercase letter, one lowercase letter,
   * one number, and one special character
   */
  public strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value: string = control.value;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      const valid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

      if (!valid) {
        return {
          strongPassword: {
            hasUpperCase,
            hasLowerCase,
            hasNumber,
            hasSpecialChar,
          },
        };
      }

      return null;
    };
  }

  /**
   * Validator to check if two fields match (useful for password confirmation)
   */
  public matchFields(
    controlName: string,
    matchingControlName: string
  ): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      if (!(formGroup instanceof FormGroup)) return null;

      const control = formGroup.get(controlName);
      const matchingControl = formGroup.get(matchingControlName);

      if (!control || !matchingControl) return null;

      if (matchingControl.errors && !matchingControl.errors['mismatch']) {
        return null;
      }

      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mismatch: true });
        return { mismatch: true };
      } else {
        matchingControl.setErrors(null);
        return null;
      }
    };
  }

  /**
   * Validator for username format
   * Allows letters, numbers, and some special characters
   */
  public usernameFormat(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const valid = /^[a-zA-Z0-9._-]+$/.test(control.value);

      return valid ? null : { usernameFormat: true };
    };
  }

  /**
   * Get user-friendly validation error message
   */
  public getErrorMessage(control: AbstractControl | null): string {
    if (!control || !control.errors) return '';

    const errors = control.errors;

    if (errors['required']) return 'This field is required';
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['minlength']) {
      return `Minimum length: ${errors['minlength'].requiredLength} characters`;
    }
    if (errors['maxlength']) {
      return `Maximum length: ${errors['maxlength'].requiredLength} characters`;
    }
    if (errors['pattern']) return 'Invalid format';
    if (errors['mismatch']) return 'Fields do not match';
    if (errors['usernameFormat']) {
      return 'Username can only contain letters, numbers, periods, underscores, and hyphens';
    }

    if (errors['strongPassword']) {
      const requirements = [];
      if (!errors['strongPassword'].hasUpperCase)
        requirements.push('uppercase letter');
      if (!errors['strongPassword'].hasLowerCase)
        requirements.push('lowercase letter');
      if (!errors['strongPassword'].hasNumber) requirements.push('number');
      if (!errors['strongPassword'].hasSpecialChar)
        requirements.push('special character');

      return `Password must include at least one ${requirements.join(', ')}`;
    }

    return 'Invalid input';
  }
}
