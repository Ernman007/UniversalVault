import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.currentUser();
    // Allow route while profile hydration completes during app init/refresh.
    if (!user) {
      return true;
    }
    const normalizedRole = (user?.role || '').toLowerCase();
    if (state.url.startsWith('/user') && normalizedRole !== 'user') {
      if (normalizedRole === 'admin') {
        return router.createUrlTree(['/admin/dashboard']);
      }
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
