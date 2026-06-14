import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { CardPinService } from '../../services/card-pin/card-pin.service';
import { AuthService } from '../../services/auth/auth.service';

/**
 * Card PIN Guard
 * 
 * Protects routes that require card PIN verification.
 * Checks if user has a PIN session token.
 * 
 * Flow:
 * 1. If user has no PIN set -> redirect to PIN setup
 * 2. If user has PIN but no session -> show PIN entry modal
 * 3. If user has valid PIN session -> allow access
 */
export const cardPinGuard: CanActivateFn = async (_route, state) => {
  const cardPinService = inject(CardPinService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated first
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // If user has a PIN session token, allow access
  if (cardPinService.hasPinSession()) {
    return true;
  }

  // Check PIN status to determine next step
  try {
    const status = await cardPinService.getPinStatus().toPromise();
    
    if (!status?.hasPin) {
      // User needs to set up PIN first
      // Store the intended destination
      sessionStorage.setItem('pinRedirectUrl', state.url);
      return router.createUrlTree(['/user/cards/pin-setup']);
    }

    // User has PIN but no session - redirect to PIN entry
    sessionStorage.setItem('pinRedirectUrl', state.url);
    return router.createUrlTree(['/user/cards/pin-entry']);
  } catch (error) {
    console.error('[CARD-PIN-GUARD] Error checking PIN status:', error);
    // On error, redirect to cards page which will handle PIN entry
    return router.createUrlTree(['/user/cards']);
  }
};

/**
 * Optional PIN Guard
 * 
 * For routes that may show different content based on PIN verification.
 * Does not block access, but stores PIN session status for component use.
 */
export const optionalCardPinGuard: CanActivateFn = async (_route, _state) => {
  const cardPinService = inject(CardPinService);
  
  // Just check session status without blocking
  if (cardPinService.hasPinSession()) {
    // Optionally verify the session is still valid
    try {
      const status = await cardPinService.checkPinSessionStatus().toPromise();
      if (!status?.valid) {
        cardPinService.clearPinSession();
      }
    } catch {
      cardPinService.clearPinSession();
    }
  }
  
  return true;
};
