import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './components/loading/loading.component';
import { DialogComponent } from './components/dialog/dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    LoginComponent,
    SideMenuComponent,
    NavBarComponent,
    CommonModule,
    LoadingComponent,
    DialogComponent,
  ],
  template: `
    <div class="flex h-screen bg-gray-100">
      <app-side-menu *ngIf="!isLoginRoute()"></app-side-menu>
      <main class="flex-1 overflow-y-auto">
        <app-nav-bar *ngIf="!isLoginRoute()"></app-nav-bar>
        <router-outlet></router-outlet>
      </main>
      <app-dialog></app-dialog>
    </div>
  `,
})
export class AppComponent {
  constructor(public router: Router) {}

  // Helper method to check if the current route matches login
  isLoginRoute(): boolean {
    return this.router.url === '/login';
  }
}
