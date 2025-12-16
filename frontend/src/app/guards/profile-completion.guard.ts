import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ProfileCompletionGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // If already on profile completion page, allow access
    if (state.url.startsWith('/profile-completion')) {
      return of(true);
    }

    // If on login, events, or unauthorized pages, allow access
    if (state.url.startsWith('/login') || 
        state.url.startsWith('/events/') || 
        state.url.startsWith('/unauthorized')) {
      return of(true);
    }

    // Check if profile completion is required
    return this.authService.isProfileCompletionRequired().pipe(
      map((response: any) => {
        if (response.statusCode === 200 && response.result === true) {
          // Profile completion is required, redirect to profile completion page
          this.router.navigate(['/profile-completion'], { replaceUrl: true });
          return false;
        }
        // Profile completion not required, allow access
        return true;
      }),
      catchError((error) => {
        console.error('Error checking profile completion:', error);
        // On error, allow access (don't block users)
        return of(true);
      })
    );
  }
}

