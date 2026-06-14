import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../../services/auth/auth.service';

export const adminGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  const normalizedRole = (user?.role || '').toLowerCase();

  if (authService.isAuthenticated() && normalizedRole === 'admin') {
    return true;
  }

  // Redirect to user dashboard if not admin but logged in, otherwise login
  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/user/dashboard']);
  }
  return router.createUrlTree(['/login']);
};
