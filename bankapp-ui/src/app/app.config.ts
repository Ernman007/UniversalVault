import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  isDevMode,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth/auth-interceptor';
import { envelopeInterceptor } from './interceptors/envelope/envelope.interceptor';
import { errorInterceptor } from './interceptors/error/error.interceptor';
import { AuthService } from './services/auth/auth.service';
import { AppConfigService } from './services/app-config/app-config.service';

// Capture PWA install prompt
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
  });
}

function initializeConfig(appConfigService: AppConfigService) {
  return () => appConfigService.load();
}

function initializeApp(authService: AuthService) {
  return () => {
    const token = localStorage.getItem('auth_token');
    const hasCachedUser = !!localStorage.getItem('auth_user');
    console.log('[APP_INITIALIZER] Starting auth bootstrap', { hasToken: !!token, hasCachedUser });
    if (!token) {
      console.log('[APP_INITIALIZER] Skipping /auth/me because token is missing');
      return of(null);
    }
    return authService.loadProfile().pipe(
      catchError((error) => {
        console.error('[APP_INITIALIZER] loadProfile error', {
          status: error?.status,
          message: error?.message,
        });
        if (error.status === 401) {
          authService.clearAuthState();
        }
        return of(null);
      }),
    );
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, envelopeInterceptor, errorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeConfig,
      deps: [AppConfigService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
