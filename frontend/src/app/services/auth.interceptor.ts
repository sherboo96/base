import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StorageService } from './storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Inject StorageService to get token
  const storageService = inject(StorageService);
  
  // Retrieve the token from storage
  const token = storageService.getItem<string>('token');

  // Inject Router for navigation
  const router = inject(Router);

  // Clone the request and add the Authorization header if the token exists
  const clonedRequest = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  // Pass the modified request and handle errors
  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized - clear token and redirect to login
        storageService.removeItem('token');
        storageService.removeItem('currentUser');
        storageService.removeItem('userPermissions');
        storageService.removeItem('userRoles');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
