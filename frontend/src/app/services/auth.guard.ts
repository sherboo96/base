import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service'; // Replace with your AuthService path

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const isLoggedIn = this.authService.isAuthenticated();
    const redirectIfLoggedIn = route.data['redirectIfLoggedIn'];

    if (isLoggedIn) {
      if (redirectIfLoggedIn) {
        // Redirect logged-in users away from login page
        this.router.navigate(['/dashboard'], { replaceUrl: true });
        return false;
      }
      return true; // Allow access to protected routes
    } else {
      if (redirectIfLoggedIn) {
        return true; // Allow access to the login page if not logged in
      }
      // Redirect to login if not logged in, using replaceUrl to prevent back navigation
      this.router.navigate(['/login'], { replaceUrl: true });
      return false;
    }
  }
}
