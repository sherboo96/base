import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { authInterceptor } from './services/auth.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { LoadingInterceptor } from './interceptors/loading.interceptor';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';

// Custom HTTP Loader for translations
export class CustomTranslateHttpLoader implements TranslateLoader {
  constructor(
    private http: HttpClient,
    private prefix: string = './assets/i18n/',
    private suffix: string = '.json'
  ) {}

  getTranslation(lang: string): Observable<any> {
    return this.http.get(`${this.prefix}${lang}${this.suffix}`);
  }
}

// Factory function for Custom Translate Loader
export function HttpLoaderFactory(http: HttpClient): TranslateLoader {
  return new CustomTranslateHttpLoader(http, './assets/i18n/', '.json');
}

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
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      })
    ), // Translation module configuration
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true }, // Loading interceptor
  ],
};
