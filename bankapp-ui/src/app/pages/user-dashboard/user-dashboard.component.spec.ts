/**
 * Integration Tests for UserDashboardComponent
 * Flow A+B: Authentication & Accounts/Balance Intelligence
 * Tests the complete dashboard flow: accounts loading, transactions, balance calculation
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { UserDashboardComponent } from './user-dashboard.component';
import { AccountService } from '../../services/account/account.service';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { TransactionService } from '../../services/transaction/transaction.service';

describe('UserDashboardComponent Integration - Flow A+B', () => {
  let component: UserDashboardComponent;
  let fixture: ComponentFixture<UserDashboardComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let toastService: ToastService;

  const mockUser = { _id: 'user-1', name: 'John Doe', email: 'john@test.com', role: 'user' };

  const mockAccounts = [
    {
      _id: 'acc-1',
      type: 'checking',
      balance: 5000,
      accountNumber: '1234567890',
      status: 'active',
    },
    {
      _id: 'acc-2',
      type: 'savings',
      balance: 10000,
      accountNumber: '0987654321',
      status: 'active',
    },
  ];

  const mockTransactions = [
    {
      _id: 'tx-1',
      amount: 3000,
      type: 'deposit',
      status: 'Completed',
      description: 'Salary',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'tx-2',
      amount: 500,
      type: 'withdrawal',
      status: 'Completed',
      description: 'ATM',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'tx-3',
      amount: 200,
      type: 'transfer',
      status: 'Completed',
      description: 'Transfer to savings',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'tx-4',
      amount: 150,
      type: 'payment',
      status: 'Completed',
      description: 'Utility bill',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'tx-5',
      amount: 100,
      type: 'deposit',
      status: 'Completed',
      description: 'Refund',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'tx-6',
      amount: 50,
      type: 'withdrawal',
      status: 'Completed',
      description: 'Coffee',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        AccountService,
        TransactionService,
        ToastService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    toastService = TestBed.inject(ToastService);

    // Set up authenticated user using the signal
    authService.currentUser.set(mockUser);
    authService.token.set('test-token');
    authService.isAuthenticated.set(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  const flushNotificationRequest = (
    response: any,
    error?: { status: number; statusText: string },
  ) => {
    const req = httpMock.expectOne(
      (request) =>
        request.url === '/api/notifications' &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '1' &&
        request.params.get('unreadOnly') === 'true',
    );
    if (error) {
      req.flush('Error', error);
      return;
    }
    req.flush(response);
  };

  describe('Flow B: Accounts & Balance Intelligence', () => {
    it('should load accounts and calculate total balance', async () => {
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush([]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.accounts()).toEqual(mockAccounts);
      expect(component.totalBalance()).toBe(15000);
    });

    it('should display account types with masked account numbers', async () => {
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush([]);

      fixture.detectChanges();
      await fixture.whenStable();

      const accounts = component.accounts();
      expect(accounts[0].type).toBe('checking');
      expect(accounts[0].accountNumber.slice(-4)).toBe('7890');
      expect(accounts[1].type).toBe('savings');
      expect(accounts[1].accountNumber.slice(-4)).toBe('4321');
    });

    it('should handle empty accounts state gracefully', async () => {
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush([]);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush([]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.accounts()).toEqual([]);
      expect(component.totalBalance()).toBe(0);
    });

    it('should handle accounts API error and show toast', async () => {
      const toastSpy = vi.spyOn(toastService, 'error');
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush([]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Failed to load accounts');
    });
  });

  describe('Flow C: Recent Transactions on Dashboard', () => {
    it('should load recent transactions and limit to 5', async () => {
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockTransactions);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.recentTransactions().length).toBe(5);
    });

    it('should calculate monthly income and expenses correctly', async () => {
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockTransactions);

      fixture.detectChanges();
      await fixture.whenStable();

      // deposits: 3000 + 100 = 3100
      expect(component.monthlyIncome()).toBe(3100);
      // withdrawals + payments + transfers: 500 + 200 + 150 + 50 = 900
      expect(component.monthlyExpenses()).toBe(900);
    });

    it('should always classify deposit rows as incoming', async () => {
      fixture.detectChanges();
      flushNotificationRequest([]);
      httpMock.expectOne('/api/accounts').flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush([
        {
          _id: 'tx-deposit-legacy',
          amount: 500,
          type: 'deposit',
          status: 'Completed',
          description: 'Admin deposit',
          createdAt: new Date().toISOString(),
          isUserSender: true,
          isUserReceiver: true,
        },
      ]);

      fixture.detectChanges();
      await fixture.whenStable();

      const tx = component.recentTransactions()[0] as any;
      expect(component.isIncomingTransaction(tx)).toBe(true);
      expect(component.monthlyIncome()).toBe(500);
      expect(component.monthlyExpenses()).toBe(0);
    });

    it('should handle transactions API error gracefully', async () => {
      const toastSpy = vi.spyOn(toastService, 'error');
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush('Error', { status: 500, statusText: 'Server Error' });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Failed to load recent transactions');
    });
  });

  describe('Flow A: Auth State Integration', () => {
    it('should display user name from auth service', async () => {
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush([]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.user()?.name).toBe('John Doe');
    });

    it('should logout and clear auth state', async () => {
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush([]);

      component.logout();

      const logoutReq = httpMock.expectOne('/api/auth/logout');
      expect(logoutReq.request.method).toBe('GET');
      logoutReq.flush({ success: true });

      await fixture.whenStable();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.currentUser()).toBeNull();
    });
  });

  describe('Dashboard Quick Actions Navigation', () => {
    it('should have navigation items configured', async () => {
      fixture.detectChanges();
      flushNotificationRequest([]);
      const req = httpMock.expectOne('/api/accounts');
      req.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush([]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.navItems.length).toBe(4);
      expect(component.navItems[0].route).toBe('/user/dashboard');
      expect(component.navItems[1].route).toBe('/user/accounts');
      expect(component.navItems[2].route).toBe('/user/transfer');
      expect(component.navItems[3].route).toBe('/user/cards');
    });
  });

  describe('Notification Bell Badge', () => {
    it('should hide red badge when notifications count is zero', async () => {
      fixture.detectChanges();
      flushNotificationRequest({ notifications: { count: 0 } });
      httpMock.expectOne('/api/accounts').flush([]);
      httpMock.expectOne('/api/transactions').flush([]);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bg-red-500')).toBeNull();
      expect(compiled.textContent).toContain('No unread notifications');
    });

    it('should show red badge when notifications count is greater than zero', async () => {
      fixture.detectChanges();
      flushNotificationRequest({ notifications: { count: 3 } });
      httpMock.expectOne('/api/accounts').flush([]);
      httpMock.expectOne('/api/transactions').flush([]);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bg-red-500')).not.toBeNull();
      expect(compiled.textContent).toContain('3 unread notifications');
    });

    it('should treat null notifications payload as zero count', async () => {
      fixture.detectChanges();
      flushNotificationRequest(null);
      httpMock.expectOne('/api/accounts').flush([]);
      httpMock.expectOne('/api/transactions').flush([]);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bg-red-500')).toBeNull();
    });

    it('should treat undefined count as zero', async () => {
      fixture.detectChanges();
      flushNotificationRequest({ notifications: { count: undefined } });
      httpMock.expectOne('/api/accounts').flush([]);
      httpMock.expectOne('/api/transactions').flush([]);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bg-red-500')).toBeNull();
    });

    it('should hide badge on notification count network failure', async () => {
      fixture.detectChanges();
      flushNotificationRequest(null, { status: 500, statusText: 'Server Error' });
      httpMock.expectOne('/api/accounts').flush([]);
      httpMock.expectOne('/api/transactions').flush([]);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bg-red-500')).toBeNull();
      expect(component.notificationCount()).toBe(0);
    });
  });
});
