/**
 * Integration Tests for UserCardsComponent
 * Flow E: Cards
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { UserCardsComponent } from './user-cards.component';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';

describe('UserCardsComponent Integration - Flow E', () => {
  let component: UserCardsComponent;
  let fixture: ComponentFixture<UserCardsComponent>;
  let httpMock: HttpTestingController;
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
  const mockCards = [
    {
      _id: 'card-1',
      cardNumber: '4111111111111111',
      cardType: 'credit',
      expirationDate: '2025-12',
      cvv: '123',
      isFrozen: false,
      status: 'active',
      accountId: 'acc-1',
      creditLimit: 10000,
      cardHolderName: 'JOHN DOE',
    },
    {
      _id: 'card-2',
      cardNumber: '5500000000000004',
      cardType: 'debit',
      expirationDate: '2026-06',
      cvv: '456',
      isFrozen: false,
      status: 'active',
      accountId: 'acc-2',
      cardHolderName: 'JOHN DOE',
    },
  ];
  const mockTransactions = [
    {
      _id: 'tx-1',
      amount: 150,
      type: 'payment',
      status: 'Completed',
      description: 'Online purchase',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'tx-2',
      amount: 50,
      type: 'withdrawal',
      status: 'Completed',
      description: 'ATM withdrawal',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'tx-3',
      amount: 75,
      type: 'payment',
      status: 'Completed',
      description: 'Restaurant',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [UserCardsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);

    const authService = TestBed.inject(AuthService);
    (authService as any).currentUser.set(mockUser);
    (authService as any).token.set('test-token');
    (authService as any).isAuthenticated.set(true);

    fixture = TestBed.createComponent(UserCardsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Initial Load', () => {
    it('should load accounts and cards on init', async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const cardsReq = httpMock.expectOne('/api/cards/acc-1');
      cardsReq.flush(mockCards);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockTransactions);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.accounts().length).toBe(2);
      expect(component.cards().length).toBe(2);
      expect(component.primaryAccountId).toBe('acc-1');
    });

    it('should handle empty accounts gracefully', async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush([]);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.accounts()).toEqual([]);
      expect(component.cards()).toEqual([]);
    });
  });

  describe('Card Transactions', () => {
    it('should filter card transactions to payments and withdrawals', async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const cardsReq = httpMock.expectOne('/api/cards/acc-1');
      cardsReq.flush(mockCards);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockTransactions);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const cardTxs = component.cardTransactions();
      expect(cardTxs.length).toBe(3);
      expect(cardTxs.every((tx) => tx.type === 'payment' || tx.type === 'withdrawal')).toBe(true);
    });

    it('should calculate monthly card spending', async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const cardsReq = httpMock.expectOne('/api/cards/acc-1');
      cardsReq.flush(mockCards);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockTransactions);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.monthlyCardSpending()).toBe(275);
    });
  });

  describe('Freeze/Unfreeze Card', () => {
    it('should open lock card modal', async () => {
      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const cardsReq = httpMock.expectOne('/api/cards/acc-1');
      cardsReq.flush(mockCards);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockTransactions);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const card = mockCards[0];
      component.openLockCard(card);

      expect(component.selectedCard).toEqual(card);
      expect(component.lockCardOpen).toBe(true);
    });
  });

  describe('Request New Card', () => {
    it('should request new debit card', async () => {
      vi.spyOn(toastService, 'success');

      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const cardsReq = httpMock.expectOne('/api/cards/acc-1');
      cardsReq.flush(mockCards);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockTransactions);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      component.selectedAccountId = 'acc-1';
      component.cardTypeReq = 'debit';
      component.requestCard();

      const req = httpMock.expectOne('/api/cards/request');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        cardType: 'debit',
        accountNumber: '1234567890',
        IBAN: undefined,
      });
      req.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      // Reload cards
      const reloadCardsReq = httpMock.expectOne('/api/cards/acc-1');
      reloadCardsReq.flush(mockCards);

      const reloadTxReq = httpMock.expectOne('/api/transactions');
      reloadTxReq.flush(mockTransactions);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastService.success).toHaveBeenCalledWith('Card request submitted successfully!');
    });
  });

  describe('Card Settings', () => {
    it('should save card settings', async () => {
      vi.spyOn(toastService, 'success');

      fixture.detectChanges();

      const accountsReq = httpMock.expectOne('/api/accounts');
      accountsReq.flush(mockAccounts);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const cardsReq = httpMock.expectOne('/api/cards/acc-1');
      cardsReq.flush(mockCards);

      const txReq = httpMock.expectOne('/api/transactions');
      txReq.flush(mockTransactions);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const card = mockCards[0];
      component.selectedCard = card;
      component.cardDailyLimit = 500;
      component.saveCardSettings();

      const req = httpMock.expectOne('/api/cards/card-1/settings');
      expect(req.request.method).toBe('PUT');
      req.flush({ ...card, dailyLimit: 500 });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastService.success).toHaveBeenCalledWith('Card settings saved successfully');
    });
  });

  describe('Navigation', () => {
    it('should have correct navigation items', () => {
      expect(component.navItems.length).toBe(4);
      expect(component.navItems[0].route).toBe('/user/dashboard');
      expect(component.navItems[1].route).toBe('/user/accounts');
      expect(component.navItems[2].route).toBe('/user/transfer');
      expect(component.navItems[3].route).toBe('/user/cards');
    });
  });
});
