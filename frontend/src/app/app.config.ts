import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { authInterceptor } from './services/auth.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { LoadingInterceptor } from './interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // Provide routing configuration
    provideHttpClient(withInterceptors([authInterceptor])), // Provide HttpClient globally
    importProvidersFrom(BrowserAnimationsModule), // Required for animations
    importProvidersFrom(
      ToastrModule.forRoot({
        timeOut: 3000, // Toast display timeout
        positionClass: 'toast-top-right', // Toast position
        preventDuplicates: true, // Prevent duplicate toasts
      })
    ), // Global Toastr configuration
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true }, // Loading interceptor
  ],
};
