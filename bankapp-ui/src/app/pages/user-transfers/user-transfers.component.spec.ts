import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { UserTransfersComponent } from './user-transfers.component';
import { AccountService } from '../../services/account/account.service';
import { AuthService } from '../../services/auth/auth.service';
import { BeneficiaryService } from '../../services/beneficiary/beneficiary.service';
import { ToastService } from '../../services/notification/toast.service';
import { TransactionService } from '../../services/transaction/transaction.service';
import { TransferService } from '../../services/transfer/transfer.service';

describe('UserTransfersComponent Integration - Flow D', () => {
  let component: UserTransfersComponent;
  let fixture: ComponentFixture<UserTransfersComponent>;
  let httpMock: HttpTestingController;
  let router: Router;
  let location: Location;
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

  const mockBeneficiaries = [
    { _id: 'ben-1', nickname: 'Mom', accountNumber: '1111111111', bankCode: 'BANK001' },
    { _id: 'ben-2', nickname: 'Dad', accountNumber: '2222222222', bankCode: 'BANK002' },
  ];

  const mockRecentTransfers = [
    {
      _id: 'tx-1',
      amount: 500,
      type: 'transfer',
      description: 'Monthly savings',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'tx-2',
      amount: 200,
      type: 'transfer_in',
      description: 'Received',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserTransfersComponent],
      providers: [
        provideRouter([
          { path: 'user/dashboard', component: UserTransfersComponent }, // Dummy route
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        AccountService,
        TransactionService,
        TransferService,
        BeneficiaryService,
        ToastService,
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    toastService = TestBed.inject(ToastService);

    // Set up authenticated user
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set(mockUser);
    authService.token.set('test-token');
    authService.isAuthenticated.set(true);

    fixture = TestBed.createComponent(UserTransfersComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  describe('Initial Load', () => {
    it('should load accounts, transactions, and beneficiaries on init', async () => {
      fixture.detectChanges();

      // Flush accounts
      const accountsReq = httpMock.expectOne('/api/accounts');
      expect(accountsReq.request.method).toBe('GET');
      accountsReq.flush(mockAccounts);

      // Flush transactions
      const txReq = httpMock.expectOne('/api/transactions');
      expect(txReq.request.method).toBe('GET');
      txReq.flush(mockRecentTransfers);

      // Flush beneficiaries
      const benReq = httpMock.expectOne('/api/beneficiaries');
      expect(benReq.request.method).toBe('GET');
      benReq.flush({ success: true, data: mockBeneficiaries });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.accounts().length).toBe(2);
      expect(component.recipients().length).toBe(2);
      expect(component.recentTransfers().length).toBe(2);
    });

    it('should set default account selections after loading accounts', async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockRecentTransfers);

      const benReq = httpMock.expectOne('/api/beneficiaries');
      benReq.flush({ success: true, data: mockBeneficiaries });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.internalFrom).toBe('acc-1');
      expect(component.internalTo).toBe('acc-2');
      expect(component.externalFrom).toBe('acc-1');
    });
  });

  describe('Internal Transfer Flow', () => {
    beforeEach(async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockRecentTransfers);

      const benReq = httpMock.expectOne('/api/beneficiaries');
      benReq.flush({ success: true, data: mockBeneficiaries });

      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should validate amount before showing confirmation', () => {
      const toastSpy = vi.spyOn(toastService, 'error');

      component.internalAmount = 0;
      component.submitInternalTransfer();
      expect(toastSpy).toHaveBeenCalledWith('Please enter a valid amount');

      component.internalAmount = -100;
      component.submitInternalTransfer();
      expect(toastSpy).toHaveBeenCalledTimes(2);
    });

    it('should open confirmation modal with valid amount', () => {
      component.internalAmount = 500;
      component.submitInternalTransfer();
      expect(component.confirmModalOpen).toBe(true);
      expect(component.displayAmount).toBe('500.00');
    });

    it('should execute internal transfer on confirm', async () => {
      component.internalFrom = 'acc-1';
      component.internalTo = 'acc-2';
      component.internalAmount = 500;
      component.internalNote = 'Test transfer';

      component.confirmTransfer();

      const transferReq = httpMock.expectOne('/api/transactions');
      expect(transferReq.request.method).toBe('POST');
      expect(transferReq.request.body).toEqual({
        accountId: 'acc-1',
        receiverIdentifier: 'acc-2',
        type: 'transfer',
        amount: 500,
        description: 'Test transfer',
      });

      transferReq.flush({ success: true, data: { _id: 'tx-new' } });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.confirmModalOpen).toBe(false);
    });

    it('should show success toast after successful transfer', async () => {
      const toastSpy = vi.spyOn(toastService, 'success');

      component.internalFrom = 'acc-1';
      component.internalTo = 'acc-2';
      component.internalAmount = 500;

      component.confirmTransfer();

      const transferReq = httpMock.expectOne('/api/transactions');
      transferReq.flush({ success: true, data: { _id: 'tx-new' } });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Transfer successful!');
    });

    it('should handle transfer error gracefully', async () => {
      const toastSpy = vi.spyOn(toastService, 'error');

      component.internalFrom = 'acc-1';
      component.internalTo = 'acc-2';
      component.internalAmount = 500;

      component.confirmTransfer();

      const transferReq = httpMock.expectOne('/api/transactions');
      transferReq.flush('Insufficient funds', { status: 400, statusText: 'Bad Request' });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Failed to process transfer');
      expect(component.confirmModalOpen).toBe(false);
    });
  });

  describe('External Transfer Flow with Verification', () => {
    beforeEach(async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockRecentTransfers);

      const benReq = httpMock.expectOne('/api/beneficiaries');
      benReq.flush({ success: true, data: mockBeneficiaries });

      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should validate amount and recipient before external transfer', () => {
      const toastSpy = vi.spyOn(toastService, 'error');

      component.externalAmount = 0;
      component.recipientSearch = 'test@test.com';
      component.submitExternalTransfer();
      expect(toastSpy).toHaveBeenCalledWith('Please enter a valid amount');

      component.externalAmount = 100;
      component.recipientSearch = '';
      component.submitExternalTransfer();
      expect(toastSpy).toHaveBeenCalledWith('Please select or enter a recipient');
    });

    it('should create transfer request and enter pending verification state', async () => {
      const toastSpy = vi.spyOn(toastService, 'info');

      component.externalFrom = 'acc-1';
      component.recipientSearch = 'external-acc-123';
      component.externalAmount = 1000;
      component.externalNote = 'Rent payment';

      component.submitExternalTransfer();

      const req = httpMock.expectOne('/api/transfer-requests');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.fromAccountId).toBe('acc-1');
      expect(req.request.body.toAccount).toBe('external-acc-123');
      expect(req.request.body.amount).toBe(1000);
      expect(req.request.body.idempotencyKey).toBeDefined();

      req.flush({ success: true, requestId: 'req-123' });

      fixture.detectChanges();
      await fixture.whenStable();
      // Flush polling request that starts automatically
      const statusReq = httpMock.expectOne('/api/transfer-requests/req-123');
      statusReq.flush({ success: true, data: { status: 'pending' } });

      expect(component.externalRequestId).toBe('req-123');
      expect(component.verificationStatus).toBe('pending');
      expect(toastSpy).toHaveBeenCalledWith('Transfer request created. Verification required.');
    });

    it('should verify transfer with 6-digit code', async () => {
      const toastSpy = vi.spyOn(toastService, 'success');

      // Setup pending state
      component.externalRequestId = 'req-123';
      component.verificationStatus = 'pending';
      component.verificationCode = '123456';

      component.verifyExternalTransfer();

      const verifyReq = httpMock.expectOne('/api/transfer-requests/verify');
      expect(verifyReq.request.method).toBe('POST');
      expect(verifyReq.request.body).toEqual({
        requestId: 'req-123',
        code: '123456',
      });

      verifyReq.flush({ success: true, message: 'Transfer verified successfully' });

      // Flush the status check
      const statusReq = httpMock.expectOne('/api/transfer-requests/req-123');
      statusReq.flush({ success: true, data: { status: 'approved' } });

      // Flush the transaction lookup
      const txReq = httpMock.expectOne('/api/transactions/by-request/req-123');
      txReq.flush({ success: true, data: {} });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.verificationStatus).toBe('verified');
      expect(toastSpy).toHaveBeenCalledWith('Transfer verified successfully');
    });

    it('should reject invalid verification code format', async () => {
      const toastSpy = vi.spyOn(toastService, 'error');

      component.externalRequestId = 'req-123';
      component.verificationCode = '123'; // Too short

      component.verifyExternalTransfer();

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Please enter the 6-digit verification code');
      expect(httpMock.match('/api/transfer-requests/verify').length).toBe(0);
    });

    it('should handle verification failure', async () => {
      const toastSpy = vi.spyOn(toastService, 'error');

      component.externalRequestId = 'req-123';
      component.verificationStatus = 'pending';
      component.verificationCode = '654321'; // Wrong code

      component.verifyExternalTransfer();

      const verifyReq = httpMock.expectOne('/api/transfer-requests/verify');
      verifyReq.flush(
        { message: 'Invalid or expired verification code' },
        { status: 400, statusText: 'Bad Request' },
      );

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.verificationStatus).toBe('failed');
      expect(toastSpy).toHaveBeenCalled();
    });

    it('should handle duplicate transfer request with idempotency key', async () => {
      component.externalFrom = 'acc-1';
      component.recipientSearch = 'external-acc-123';
      component.externalAmount = 1000;
      component.externalIdempotencyKey = 'unique-key-123';

      component.submitExternalTransfer();

      const req = httpMock.expectOne('/api/transfer-requests');
      expect(req.request.body.idempotencyKey).toBe('unique-key-123');
      req.flush({ success: true, requestId: 'req-123', duplicate: true });

      fixture.detectChanges();
      // Flush polling request
      const statusReq = httpMock.expectOne('/api/transfer-requests/req-123');
      statusReq.flush({ success: true, data: { status: 'pending' } });

      await fixture.whenStable();

      expect(component.verificationStatus).toBe('pending');
    });
  });

  describe('Beneficiary Selection', () => {
    beforeEach(async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockRecentTransfers);

      const benReq = httpMock.expectOne('/api/beneficiaries');
      benReq.flush({ success: true, data: mockBeneficiaries });

      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should select recipient from saved beneficiaries', () => {
      const toastSpy = vi.spyOn(toastService, 'info');

      component.selectRecipient('Mom');

      expect(component.recipientSearch).toBe('Mom');
      expect(toastSpy).toHaveBeenCalledWith('Selected Mom');
    });

    it('should generate avatar URL for beneficiary', () => {
      const url = component.getAvatar('Mom');
      expect(url).toContain('dicebear.com');
      expect(url).toContain('Mom');
    });
  });

  describe('Transfer Status Polling', () => {
    it('should poll transfer status after request', async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockRecentTransfers);

      const benReq = httpMock.expectOne('/api/beneficiaries');
      benReq.flush({ success: true, data: mockBeneficiaries });

      fixture.detectChanges();
      await fixture.whenStable();

      component.externalFrom = 'acc-1';
      component.recipientSearch = 'external-acc';
      component.externalAmount = 100;
      component.submitExternalTransfer();

      const transferReq = httpMock.expectOne('/api/transfer-requests');
      transferReq.flush({ success: true, requestId: 'req-123' });

      fixture.detectChanges();
      await fixture.whenStable();

      // Status polling should happen
      const statusReq = httpMock.expectOne('/api/transfer-requests/req-123');
      expect(statusReq.request.method).toBe('GET');
      statusReq.flush({ success: true, data: { status: 'pending' } });

      fixture.detectChanges();
      await fixture.whenStable();
    });
  });
});
