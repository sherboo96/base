import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Retrieve the token from localStorage
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtLnNoZXJiZW55IiwianRpIjoiMmRjNjkyNTQtYWJhYi00YWMxLWE0NTktYzUwNDk5YmFhNGRhIiwiZW1haWwiOiJtLnNoZXJiZW55QG1vby5nb3Yua3ciLCJvcmdpbml6YXRpb24iOiIiLCJkZXBhcnRtZW50IjoiIiwicG9zaXRpb24iOiIiLCJyb2xlcyI6IlN1cGVyQWRtaW4iLCJleHAiOjE3NDg0Njg4MzgsImlzcyI6Ik1PTyIsImF1ZCI6Ik1PT1VTRVIifQ.RfDOg7KJZqqMLr8NORT7rfnw0hVbseLTK90P-b4Xz98';
  //   console.log('Token retrieved in interceptor:', token);

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

  //   console.log('Cloned request with token:', clonedRequest);

  // Pass the modified request and handle errors
  return next(clonedRequest).pipe();
};
