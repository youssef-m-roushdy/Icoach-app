import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { refreshTokenInterceptor } from './core/interceptors/refresh-token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    // Interceptor execution order (request: top→bottom, response: bottom→top):
    //   1. authInterceptor          — attaches Bearer token + withCredentials to every request
    //   2. refreshTokenInterceptor  — catches 401 responses, calls refresh endpoint, retries original request
    //   3. errorInterceptor         — handles all other errors (500, network failures, etc.)
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        refreshTokenInterceptor,
        errorInterceptor,
      ])
    ),

    provideAnimations(), // Required for Angular Material
  ],
};