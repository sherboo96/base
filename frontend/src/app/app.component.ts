import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './components/loading/loading.component';
import { TranslationService } from './services/translation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    SideMenuComponent,
    NavBarComponent,
    CommonModule,
    LoadingComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(
    public router: Router,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Initialize translation service to set language and direction
    this.translationService.getCurrentLanguage();
  }

  // Helper method to check if the current route matches login
  isLoginRoute(): boolean {
    return this.router.url === '/login';
  }
}
