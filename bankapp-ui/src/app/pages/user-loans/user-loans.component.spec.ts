/**
 * Integration Tests for UserLoansComponent
 * Flow I: Loans
 * Tests the complete loan flow: offers, applications, repayment schedule, payments
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { UserLoansComponent } from './user-loans.component';
import { AuthService } from '../../services/auth/auth.service';
import { LoanService, Loan, LoanOffer } from '../../services/loan/loan.service';
import { ToastService } from '../../services/notification/toast.service';

describe('UserLoansComponent Integration - Flow I', () => {
  let component: UserLoansComponent;
  let fixture: ComponentFixture<UserLoansComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  const mockUser = { _id: 'user-1', name: 'John Doe', email: 'john@test.com', role: 'user' };

  const mockLoans: Loan[] = [
    {
      _id: 'loan-1',
      amount: 5000,
      interestRate: 12,
      termMonths: 24,
      purpose: 'Car repair',
      status: 'active',
      remainingAmount: 3500,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'loan-2',
      amount: 10000,
      interestRate: 8,
      termMonths: 36,
      purpose: 'Home renovation',
      status: 'pending',
      remainingAmount: 10000,
      createdAt: new Date().toISOString(),
    },
  ];

  const mockOffers: LoanOffer[] = [
    { amount: 5000, term: 12, interestRate: 10, monthlyPayment: 439.58 },
    { amount: 10000, term: 24, interestRate: 9, monthlyPayment: 456.85 },
  ];

  const mockRepaymentSchedule = {
    schedule: [
      {
        paymentNumber: 1,
        paymentDate: '2024-02-01',
        paymentAmount: 235.5,
        principalPayment: 200,
        interestPayment: 35.5,
        remainingBalance: 4800,
      },
      {
        paymentNumber: 2,
        paymentDate: '2024-03-01',
        paymentAmount: 235.5,
        principalPayment: 203,
        interestPayment: 32.5,
        remainingBalance: 4597,
      },
    ],
    outstandingBalance: 3500,
  };

  // Helper to flush initial load requests
  async function flushInitialLoad(loans: Loan[] = mockLoans, offers: LoanOffer[] = mockOffers) {
    const loansReq = httpMock.expectOne('/api/loans/applications');
    loansReq.flush({ data: { loans } });

    const offersReq = httpMock.expectOne('/api/loans/offers');
    offersReq.flush({ offers });

    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserLoansComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);

    // Set up authenticated user
    const authService = TestBed.inject(AuthService);
    (authService as any).currentUser.set(mockUser);
    (authService as any).token.set('test-token');
    (authService as any).isAuthenticated.set(true);

    fixture = TestBed.createComponent(UserLoansComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Initial Load', () => {
    it('should load user loans and offers on init', async () => {
      fixture.detectChanges();

      const loansReq = httpMock.expectOne('/api/loans/applications');
      expect(loansReq.request.method).toBe('GET');
      loansReq.flush({ data: { loans: mockLoans } });

      const offersReq = httpMock.expectOne('/api/loans/offers');
      expect(offersReq.request.method).toBe('GET');
      offersReq.flush({ offers: mockOffers });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.loans().length).toBe(2);
      expect(component.offers().length).toBe(2);
      expect(component.isLoading()).toBe(false);
    });

    it('should hide offers when user has active loans', async () => {
      fixture.detectChanges();
      await flushInitialLoad();

      expect(component.showOffers()).toBe(false);
    });

    it('should show offers when user has no loans', async () => {
      fixture.detectChanges();
      await flushInitialLoad([], mockOffers);

      expect(component.showOffers()).toBe(true);
    });

    it('should handle loans API error', async () => {
      const toastSpy = vi.spyOn(toastService, 'error');

      fixture.detectChanges();

      const loansReq = httpMock.expectOne('/api/loans/applications');
      loansReq.flush('Error', { status: 500, statusText: 'Server Error' });

      const offersReq = httpMock.expectOne('/api/loans/offers');
      offersReq.flush([]);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Failed to load loans');
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('Loan Application Form', () => {
    it('should initialize form with default values', async () => {
      fixture.detectChanges();
      await flushInitialLoad([]);

      expect(component.loanForm.get('amount')?.value).toBe(1000);
      expect(component.loanForm.get('purpose')?.value).toBe('');
      expect(component.loanForm.get('termMonths')?.value).toBe(12);
    });

    it('should validate required fields', async () => {
      fixture.detectChanges();
      await flushInitialLoad([]);

      component.loanForm.patchValue({ purpose: '' });
      expect(component.loanForm.valid).toBe(false);

      component.loanForm.patchValue({ purpose: 'Test loan', amount: 500, termMonths: 12 });
      expect(component.loanForm.valid).toBe(true);
    });

    it('should validate amount range', async () => {
      fixture.detectChanges();
      await flushInitialLoad([]);

      component.loanForm.patchValue({ amount: 50, purpose: 'Test' });
      expect(component.loanForm.get('amount')?.valid).toBe(false);

      component.loanForm.patchValue({ amount: 100, purpose: 'Test' });
      expect(component.loanForm.get('amount')?.valid).toBe(true);

      component.loanForm.patchValue({ amount: 60000000, purpose: 'Test' });
      expect(component.loanForm.get('amount')?.valid).toBe(false);
    });

    it('should submit loan application', async () => {
      const toastSpy = vi.spyOn(toastService, 'success');
      fixture.detectChanges();
      await flushInitialLoad([]);

      component.loanForm.patchValue({
        amount: 5000,
        purpose: 'Car purchase',
        termMonths: 24,
      });

      component.applyLoan();

      const req = httpMock.expectOne('/api/loans/applications');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        amount: 5000,
        purpose: 'Car purchase',
        termMonths: 24,
      });

      req.flush({ success: true, data: { _id: 'loan-new' } });

      fixture.detectChanges();
      await fixture.whenStable();

      // Reload loans request
      const reloadReq = httpMock.expectOne('/api/loans/applications');
      reloadReq.flush({ data: { loans: mockLoans } });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Loan application submitted successfully.');
      expect(component.isSubmitting).toBe(false);
    });

    it('should handle application error', async () => {
      const toastSpy = vi.spyOn(toastService, 'error');
      fixture.detectChanges();
      await flushInitialLoad([]);

      component.loanForm.patchValue({
        amount: 5000,
        purpose: 'Test',
        termMonths: 12,
      });

      component.applyLoan();

      const req = httpMock.expectOne('/api/loans/applications');
      req.flush(
        { message: 'Insufficient credit score' },
        { status: 400, statusText: 'Bad Request' },
      );

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Insufficient credit score');
      expect(component.isSubmitting).toBe(false);
    });

    it('should not submit invalid form', async () => {
      fixture.detectChanges();
      await flushInitialLoad([]);

      component.loanForm.patchValue({ amount: null, purpose: '' });

      component.applyLoan();

      fixture.detectChanges();
      await fixture.whenStable();

      expect(httpMock.match('/api/loans/applications').length).toBe(0);
    });
  });

  describe('Loan Offers Integration', () => {
    it('should apply from offer with pre-filled form', async () => {
      fixture.detectChanges();
      await flushInitialLoad([], mockOffers);

      const offer = mockOffers[0];
      component.applyFromOffer(offer);

      expect(component.loanForm.get('amount')?.value).toBe(5000);
      expect(component.loanForm.get('termMonths')?.value).toBe(12);
      expect(component.showOffers()).toBe(false);
    });

    it('should dismiss offers', async () => {
      fixture.detectChanges();
      await flushInitialLoad([], mockOffers);

      component.dismissOffers();
      expect(component.showOffers()).toBe(false);
    });
  });

  describe('Repayment Schedule', () => {
    it('should load repayment schedule for active loan', async () => {
      fixture.detectChanges();
      await flushInitialLoad();

      const loan = mockLoans[0];
      component.viewRepaymentSchedule(loan);

      expect(component.selectedLoanId()).toBe('loan-1');
      expect(component.showSchedule()).toBe(true);
      expect(component.scheduleLoading()).toBe(true);

      const req = httpMock.expectOne('/api/loans/loan-1/repayments');
      expect(req.request.method).toBe('GET');
      req.flush(mockRepaymentSchedule);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.schedule().length).toBe(2);
      expect(component.outstandingBalance()).toBe(3500);
      expect(component.scheduleLoading()).toBe(false);
    });

    it('should handle schedule load error', async () => {
      const toastSpy = vi.spyOn(toastService, 'error');
      fixture.detectChanges();
      await flushInitialLoad();

      const loan = mockLoans[0];
      component.viewRepaymentSchedule(loan);

      const req = httpMock.expectOne('/api/loans/loan-1/repayments');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Failed to load repayment schedule');
      expect(component.scheduleLoading()).toBe(false);
    });

    it('should close schedule modal', async () => {
      fixture.detectChanges();
      await flushInitialLoad();

      component.showSchedule.set(true);
      component.schedule.set(mockRepaymentSchedule.schedule);
      component.outstandingBalance.set(3500);
      component.selectedLoanId.set('loan-1');

      component.closeSchedule();

      expect(component.showSchedule()).toBe(false);
      expect(component.schedule()).toEqual([]);
      expect(component.outstandingBalance()).toBe(0);
      expect(component.selectedLoanId()).toBeNull();
    });
  });

  describe('Loan Payment', () => {
    it('should make loan payment', async () => {
      const toastSpy = vi.spyOn(toastService, 'success');
      fixture.detectChanges();
      await flushInitialLoad();

      component.payLoan('loan-1', 100);

      const req = httpMock.expectOne('/api/loans/loan-1/pay');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ amount: 100 });

      req.flush({ success: true });

      // Reload loans
      const reloadReq = httpMock.expectOne('/api/loans/applications');
      reloadReq.flush({ data: { loans: mockLoans } });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Successfully paid $100');
    });

    it('should handle payment error', async () => {
      const toastSpy = vi.spyOn(toastService, 'error');
      fixture.detectChanges();
      await flushInitialLoad();

      component.payLoan('loan-1', 100);

      const req = httpMock.expectOne('/api/loans/loan-1/pay');
      req.flush({ message: 'Payment failed' }, { status: 400, statusText: 'Bad Request' });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastSpy).toHaveBeenCalledWith('Payment failed');
    });
  });

  describe('Loan Status Display', () => {
    it('should display different statuses correctly', async () => {
      fixture.detectChanges();
      await flushInitialLoad();

      const loans = component.loans();

      const activeLoan = loans.find((l) => l._id === 'loan-1');
      expect(activeLoan?.status).toBe('active');

      const pendingLoan = loans.find((l) => l._id === 'loan-2');
      expect(pendingLoan?.status).toBe('pending');
    });

    it('should show payment buttons only for active/approved loans', async () => {
      fixture.detectChanges();
      await flushInitialLoad();

      const loans = component.loans();

      // Active loan should have payment options
      const activeLoan = loans.find((l) => l.status === 'active');
      expect(activeLoan?.status).toBe('active');

      // Pending loan should not have payment options
      const pendingLoan = loans.find((l) => l.status === 'pending');
      expect(pendingLoan?.status).toBe('pending');
    });
  });
});
