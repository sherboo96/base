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
    const isLoggedIn = this.authService.isAuthenticated(); // Replace with your logic to check login status
    const redirectIfLoggedIn = route.data['redirectIfLoggedIn'];

    if (isLoggedIn) {
      if (redirectIfLoggedIn) {
        this.router.navigate(['/dashboard']); // Redirect logged-in users to the dashboard
        return false;
      }
      return true; // Allow access to protected routes
    } else {
      if (redirectIfLoggedIn) {
        return true; // Allow access to the login page if not logged in
      }
      this.router.navigate(['/login']); // Redirect to login if not logged in
      return false;
    }
  }
}
