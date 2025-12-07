import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root', // Makes this service globally available
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private storageService: StorageService,
    private router: Router
  ) {
    // Initialize current user from storage
    const storedUser = this.storageService.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(storedUser);
    }
  }

  // Login method
  login(credentials: {
    username: string;
    password: string;
  }): Observable<any> {
    return this.http
      .post(`${environment.baseUrl}/Authentications/login`, credentials)
      .pipe(
        tap((response: any) => {
          if (response && response.result.token) {
            this.storageService.setItem('token', response.result.token);
            this.storageService.setItem('currentUser', response.result.user);
            this.currentUserSubject.next(response.result.user); // Navigate to dashboard after successful login
          }
        })
      );
  }

  // Example of other auth-related methods (optional)
  getToken(): string | null {
    return this.storageService.getItem('token');
  }

  isAuthenticated(): boolean {
    console.log('isAuthenticated', !!this.getToken());
    return !!this.getToken();
  }

  // Get user permissions from token
  getUserPermissions(): Observable<any> {
    return this.http.get(`${environment.baseUrl}/Authentications/permissions`).pipe(
      tap((response: any) => {
        if (response && response.result) {
          // Store permissions array
          this.storageService.setItem('userPermissions', response.result.permissions || []);
          // Store side menu permissions
          this.storageService.setItem('sideMenuPermissions', response.result.sideMenu || []);
        }
      })
    );
  }

  logout(): void {
    this.storageService.removeItem('token');
    this.storageService.removeItem('currentUser');
    this.storageService.removeItem('userPermissions');
    this.storageService.removeItem('sideMenuPermissions');
    this.storageService.removeItem('userRoles');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']); // Redirect to login page
  }
}
