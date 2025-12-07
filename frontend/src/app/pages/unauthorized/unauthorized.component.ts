import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-4">
      <div class="max-w-md w-full text-center">
        <div class="mb-6 flex justify-center">
          <div
            class="w-20 h-20 rounded-full bg-[#f5f5f5] flex items-center justify-center"
          >
            <i class="material-icons text-5xl text-[#c9ae81]">lock</i>
          </div>
        </div>
        <h1 class="text-2xl font-bold text-gray-800 mb-3">Access Denied</h1>
        <p class="text-gray-600 mb-8 leading-relaxed">
          You don't have permission to access this page. Please contact your
          administrator if you believe this is an error.
        </p>
        <button
          (click)="goToDashboard()"
          class="w-full max-w-xs mx-auto bg-[#c9ae81] hover:bg-[#b89a6e] text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#c9ae81] focus:ring-opacity-50"
        >
          Return to Dashboard
        </button>
        <p class="mt-6 text-sm text-gray-500">
          Need help? Contact your system administrator
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .material-icons {
        font-size: 3rem;
      }
    `,
  ],
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
