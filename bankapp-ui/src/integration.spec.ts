/**
 * Integration Tests for BankApp User Flows
 * These tests verify that components, services, and HTTP work together correctly
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AccountService } from './app/services/account/account.service';
import { AuthService } from './app/services/auth/auth.service';
import { BeneficiaryService } from './app/services/beneficiary/beneficiary.service';
import { CardService } from './app/services/card/card.service';
import { NotificationService } from './app/services/notification/notification.service';
import { TransactionService } from './app/services/transaction/transaction.service';
import { TransferService, TransferRequest } from './app/services/transfer/transfer.service';

describe('BankApp Integration Tests - User Flows', () => {
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let accountService: AccountService;
  let transactionService: TransactionService;
  let transferService: TransferService;
  let cardService: CardService;
  let notificationService: NotificationService;
  let beneficiaryService: BeneficiaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        AccountService,
        TransactionService,
        TransferService,
        CardService,
        NotificationService,
        BeneficiaryService,
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    accountService = TestBed.inject(AccountService);
    transactionService = TestBed.inject(TransactionService);
    transferService = TestBed.inject(TransferService);
    cardService = TestBed.inject(CardService);
    notificationService = TestBed.inject(NotificationService);
    beneficiaryService = TestBed.inject(BeneficiaryService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  describe('Flow 1: User Authentication', () => {
    it('should login user and set auth state across services', () => {
      const mockUser = { _id: 'user-1', name: 'John Doe', email: 'john@test.com', role: 'user' };
      const mockToken = 'jwt-token-123';

      // Verify initial state
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.currentUser()).toBeNull();
      expect(authService.token()).toBeNull();

      // Trigger login
      authService
        .login({ email: 'john@test.com', password: 'password123' })
        .subscribe((response) => {
          expect(response.user).toEqual(mockUser);
          expect(response.token).toBe(mockToken);
        });

      // Verify HTTP call
      const loginReq = httpMock.expectOne('/api/auth/login');
      expect(loginReq.request.method).toBe('POST');
      expect(loginReq.request.body).toEqual({ email: 'john@test.com', password: 'password123' });
      loginReq.flush({ user: mockUser, token: mockToken });

      // Verify auth state updated
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.currentUser()).toEqual(mockUser);
      expect(authService.token()).toBe(mockToken);
      expect(localStorage.getItem('auth_token')).toBe(mockToken);
    });

    it('should logout user and clear auth state across all services', () => {
      // Setup logged in state
      localStorage.setItem('auth_token', 'test-token');
      authService['token'].set('test-token');
      authService['isAuthenticated'].set(true);

      expect(authService.isAuthenticated()).toBe(true);

      // Trigger logout
      authService.logout();

      const logoutReq = httpMock.expectOne('/api/auth/logout');
      expect(logoutReq.request.method).toBe('GET');
      logoutReq.flush({ success: true });

      // Verify auth state cleared
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.currentUser()).toBeNull();
      expect(authService.token()).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Flow 2: Dashboard - Accounts and Transactions', () => {
    it('should fetch accounts and transactions together', () => {
      const mockAccounts = [
        { _id: 'acc-1', type: 'checking', balance: 5000, accountNumber: '1234567890' },
        { _id: 'acc-2', type: 'savings', balance: 10000, accountNumber: '0987654321' },
      ];

      const mockTransactions = [
        {
          _id: 'tx-1',
          amount: 100,
          type: 'deposit',
          status: 'Completed',
          description: 'Salary',
          createdAt: '2024-01-01',
        },
        {
          _id: 'tx-2',
          amount: 50,
          type: 'withdrawal',
          status: 'Completed',
          description: 'ATM',
          createdAt: '2024-01-02',
        },
      ];

      // Fetch accounts
      accountService.getAccounts().subscribe((accounts) => {
        expect(accounts).toEqual(mockAccounts);
      });

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      // Fetch transactions
      transactionService.getTransactions().subscribe((transactions) => {
        expect(transactions).toEqual(mockTransactions);
      });

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockTransactions);
    });

    it('should filter transactions by account', () => {
      const mockTransactions = [
        { _id: 'tx-1', amount: 100, type: 'deposit', accountId: 'acc-1' },
        { _id: 'tx-2', amount: 50, type: 'withdrawal', accountId: 'acc-2' },
      ];

      transactionService.getTransactions({ accountId: 'acc-1' }).subscribe((transactions) => {
        expect(transactions).toEqual(mockTransactions);
      });

      const txReq = httpMock.expectOne('/api/transactions?accountId=acc-1');
      txReq.flush(mockTransactions);
    });
  });

  describe('Flow 3: Transfer Money', () => {
    it('should create internal transfer between accounts', () => {
      const transferData: TransferRequest = {
        fromAccount: 'acc-1',
        toAccount: 'acc-2',
        amount: 500,
        description: 'Monthly savings',
        type: 'internal',
      };

      transferService.createTransfer(transferData).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const transferReq = httpMock.expectOne('/api/transactions');
      expect(transferReq.request.method).toBe('POST');
      transferReq.flush({ success: true, data: { _id: 'transfer-1', ...transferData } });
    });

    it('should request external transfer with verification', () => {
      const transferRequest: TransferRequest = {
        fromAccount: 'acc-1',
        toAccount: 'external-acc-123',
        amount: 1000,
        description: 'Rent payment',
        idempotencyKey: 'unique-key-123',
        type: 'external',
      };

      transferService.requestTransfer(transferRequest).subscribe((response) => {
        expect(response.requestId).toBe('req-123');
      });

      const req = httpMock.expectOne('/api/transfer-requests');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, requestId: 'req-123' });
    });

    it('should verify external transfer with code', () => {
      transferService
        .verifyTransferRequest({ requestId: 'req-123', code: '123456' })
        .subscribe((response) => {
          expect(response.success).toBe(true);
        });

      const req = httpMock.expectOne('/api/transfer-requests/verify');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ requestId: 'req-123', code: '123456' });
      req.flush({ success: true, message: 'Transfer verified' });
    });
  });

  describe('Flow 4: Card Management', () => {
    it('should fetch cards for account and manage freeze status', () => {
      const mockCards = [
        {
          _id: 'card-1',
          cardNumber: '4111111111111111',
          cardType: 'credit',
          isFrozen: false,
          accountId: 'acc-1',
        },
      ];

      // Fetch cards
      cardService.getCardsByAccountId('acc-1').subscribe((cards) => {
        expect(cards).toEqual(mockCards);
      });

      const cardsReq = httpMock.expectOne('/api/cards/acc-1');
      cardsReq.flush(mockCards);

      // Freeze card
      cardService.toggleFreezeCard('card-1').subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const freezeReq = httpMock.expectOne('/api/cards/card-1/freeze');
      expect(freezeReq.request.method).toBe('PUT');
      freezeReq.flush({ success: true, data: { ...mockCards[0], isFrozen: true } });
    });

    it('should request new card for account', () => {
      cardService.requestNewCard('acc-1', 'debit').subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne('/api/cards/request');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ accountId: 'acc-1', cardType: 'debit' });
      req.flush({ success: true, message: 'Card requested successfully' });
    });

    it('should get card transactions', () => {
      const mockCardTxs = [
        { _id: 'ctx-1', amount: 25.5, merchantDetails: 'Coffee Shop', date: '2024-01-01' },
      ];

      cardService.getCardTransactions('card-1').subscribe((transactions) => {
        expect(transactions).toEqual(mockCardTxs);
      });

      const req = httpMock.expectOne('/api/cards/card-1/transactions');
      req.flush(mockCardTxs);
    });
  });

  describe('Flow 5: Notifications', () => {
    it('should fetch and manage notifications', () => {
      const mockNotifications = [
        {
          _id: 'notif-1',
          message: 'Transfer completed',
          type: 'success',
          isRead: false,
          createdAt: '2024-01-01',
        },
        {
          _id: 'notif-2',
          message: 'New login detected',
          type: 'warning',
          isRead: true,
          createdAt: '2024-01-02',
        },
      ];

      // Fetch notifications
      notificationService.getNotifications().subscribe((notifications) => {
        expect(notifications).toEqual(mockNotifications);
      });

      const req = httpMock.expectOne('/api/notifications');
      req.flush(mockNotifications);

      // Mark as read
      notificationService.markAsRead('notif-1').subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const markReq = httpMock.expectOne('/api/notifications/notif-1/read');
      expect(markReq.request.method).toBe('PUT');
      markReq.flush({ success: true });

      // Mark all as read
      notificationService.markAllAsRead().subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const markAllReq = httpMock.expectOne('/api/notifications/mark-all-read');
      expect(markAllReq.request.method).toBe('PUT');
      markAllReq.flush({ success: true });
    });

    it('should delete notification', () => {
      notificationService.deleteNotification('notif-1').subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/notifications/notif-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  describe('Flow 6: Beneficiaries', () => {
    it('should manage transfer beneficiaries', () => {
      const mockBeneficiaries = [
        { _id: 'ben-1', nickname: 'Mom', accountNumber: '1234567890', bankCode: 'BANK001' },
        { _id: 'ben-2', nickname: 'Dad', accountNumber: '0987654321', bankCode: 'BANK002' },
      ];

      // Fetch beneficiaries
      beneficiaryService.getBeneficiaries().subscribe((response) => {
        expect(response.data).toEqual(mockBeneficiaries);
      });

      const req = httpMock.expectOne('/api/beneficiaries');
      req.flush({ success: true, data: mockBeneficiaries });

      // Add beneficiary
      const newBeneficiary = {
        nickname: 'Sister',
        accountNumber: '5555555555',
        bankName: 'BANK003',
      };
      beneficiaryService
        .createBeneficiary(newBeneficiary)
        .subscribe((response: { success: boolean; data: any }) => {
          expect(response.success).toBe(true);
        });

      const addReq = httpMock.expectOne('/api/beneficiaries');
      expect(addReq.request.method).toBe('POST');
      addReq.flush({ success: true, data: { _id: 'ben-3', ...newBeneficiary } });
    });
  });
});
