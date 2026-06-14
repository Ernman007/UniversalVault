import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { UserTransactionsComponent } from './user-transactions.component';
import { AccountService } from '../../services/account/account.service';
import { AuthService } from '../../services/auth/auth.service';
import { CardService } from '../../services/card/card.service';
import { ToastService } from '../../services/notification/toast.service';
import { TransactionService } from '../../services/transaction/transaction.service';
import { TransactionDetailModalComponent } from '../../ui/transaction-detail-modal/transaction-detail-modal.component';

@Component({
  selector: 'app-transaction-detail-modal',
  standalone: true,
  template: '',
})
class TransactionDetailModalStubComponent {
  @Input() isOpen = false;
  @Input() transactionId = '';
}

describe('UserTransactionsComponent Integration - Flow C', () => {
  let component: UserTransactionsComponent;
  let fixture: ComponentFixture<UserTransactionsComponent>;
  let authServiceMock: any;
  let accountServiceMock: any;
  let transactionServiceMock: any;
  let cardServiceMock: any;
  let toastServiceMock: any;

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
      description: 'ATM Withdrawal',
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
  ];

  const mockCards = [
    {
      _id: 'card-1',
      cardNumber: '4111111111111111',
      cardType: 'credit',
      accountId: 'acc-1',
      isFrozen: false,
      expirationDate: '2025-12',
      cvv: '123',
      status: 'active',
    },
  ];

  const mockCardTransactions = [
    { _id: 'ctx-1', amount: 25.5, merchantDetails: 'Coffee Shop', date: new Date().toISOString() },
  ];

  beforeEach(async () => {
    authServiceMock = {
      currentUser: { set: vi.fn(), subscribe: vi.fn() },
      token: { set: vi.fn() },
      isAuthenticated: { set: vi.fn() },
    };
    // Mock the signals as functions that return values
    (authServiceMock.currentUser as any) = () => mockUser;

    accountServiceMock = {
      getAccounts: vi.fn().mockReturnValue(of(mockAccounts)),
    };

    transactionServiceMock = {
      getTransactions: vi.fn().mockReturnValue(of(mockTransactions)),
    };

    cardServiceMock = {
      getCardsByAccountId: vi.fn().mockReturnValue(of([])),
      getCardTransactions: vi.fn().mockReturnValue(of([])),
    };

    toastServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UserTransactionsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: AccountService, useValue: accountServiceMock },
        { provide: TransactionService, useValue: transactionServiceMock },
        { provide: CardService, useValue: cardServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    })
      .overrideComponent(UserTransactionsComponent, {
        remove: { imports: [TransactionDetailModalComponent] },
        add: { imports: [TransactionDetailModalStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UserTransactionsComponent);
    component = fixture.componentInstance;

    // Replace component's signal with our mock
    (component as any).user = () => mockUser;

    fixture.detectChanges();
  });

  describe('Initial Load', () => {
    it('should load accounts and transactions on init', () => {
      expect(accountServiceMock.getAccounts).toHaveBeenCalled();
      expect(transactionServiceMock.getTransactions).toHaveBeenCalled();
      expect(component.accountOptions().length).toBe(2);
      expect(component.transactions().length).toBe(4);
    });
  });

  describe('Monthly Summary Calculation', () => {
    it('should calculate monthly income and expenses correctly', () => {
      // Income: 3000 (deposit)
      expect(component.monthlyIncome()).toBe(3000);
      // Expenses: 500 + 200 + 150 = 850
      expect(component.monthlyExpenses()).toBe(850);
    });

    it('should classify incoming transfer as income in monthly summary', () => {
      const now = new Date().toISOString();
      component.recalculateMonthly([
        {
          _id: 'tx-incoming-transfer',
          amount: 250,
          type: 'transfer',
          status: 'confirmed',
          description: 'Received transfer',
          createdAt: now,
          isUserSender: false,
          isUserReceiver: true,
        } as any,
      ]);

      expect(component.monthlyIncome()).toBe(250);
      expect(component.monthlyExpenses()).toBe(0);
    });

    it('should recalculate summary from currently filtered transactions', () => {
      const now = new Date().toISOString();
      component.transactions.set([
        {
          _id: 'tx-salary',
          amount: 500,
          type: 'deposit',
          status: 'confirmed',
          description: 'Salary',
          createdAt: now,
        } as any,
        {
          _id: 'tx-card',
          amount: 75,
          type: 'card_purchase',
          status: 'confirmed',
          description: 'Groceries',
          createdAt: now,
        } as any,
      ]);

      component.setTypeFilter('expenses');
      component.applyClientFilters();

      expect(component.filteredTransactions().map((tx: any) => tx._id)).toEqual(['tx-card']);
      expect(component.monthlyIncome()).toBe(0);
      expect(component.monthlyExpenses()).toBe(75);
    });
  });

  describe('Transaction Filtering', () => {
    it('should call transaction service with correct filters', () => {
      component.selectedAccountId = 'acc-1';
      component.applyFilters();
      expect(transactionServiceMock.getTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'acc-1',
        }),
      );
    });

    it('should apply Expenses chip filter to withdrawal and payment transactions', () => {
      component.setTypeFilter('expenses');
      component.applyClientFilters();
      expect(component.filteredTransactions().map((tx: any) => tx._id)).toEqual(['tx-2', 'tx-4']);
    });

    it('should not include incoming transfer in expenses chip filter', () => {
      component.transactions.set([
        {
          _id: 'tx-incoming-transfer',
          amount: 120,
          type: 'transfer',
          status: 'completed',
          description: 'Incoming transfer',
          createdAt: new Date().toISOString(),
          isUserSender: false,
          isUserReceiver: true,
        } as any,
        {
          _id: 'tx-withdrawal',
          amount: 80,
          type: 'withdrawal',
          status: 'completed',
          description: 'ATM',
          createdAt: new Date().toISOString(),
          isUserSender: true,
          isUserReceiver: false,
        } as any,
      ]);

      component.setTypeFilter('expenses');
      component.applyClientFilters();

      expect(component.filteredTransactions().map((tx: any) => tx._id)).toEqual(['tx-withdrawal']);
    });

    it('should classify incoming payment as income and exclude it from expenses', () => {
      component.transactions.set([
        {
          _id: 'tx-incoming-payment',
          amount: 100,
          type: 'payment',
          status: 'completed',
          description: 'Received payment',
          createdAt: new Date().toISOString(),
          isUserSender: false,
          isUserReceiver: true,
        } as any,
        {
          _id: 'tx-outgoing-payment',
          amount: 60,
          type: 'payment',
          status: 'completed',
          description: 'Sent payment',
          createdAt: new Date().toISOString(),
          isUserSender: true,
          isUserReceiver: false,
        } as any,
      ]);

      component.setTypeFilter('income');
      component.applyClientFilters();
      expect(component.filteredTransactions().map((tx: any) => tx._id)).toEqual([
        'tx-incoming-payment',
      ]);

      component.setTypeFilter('expenses');
      component.applyClientFilters();
      expect(component.filteredTransactions().map((tx: any) => tx._id)).toEqual([
        'tx-outgoing-payment',
      ]);
    });

    it('should apply drawer filters for status, date, amount, account, and search', () => {
      component.transactions.set([
        {
          _id: 'tx-a',
          amount: 250,
          type: 'deposit',
          status: 'Completed',
          description: 'Salary bonus',
          createdAt: '2026-03-10T10:00:00.000Z',
          toAccountId: 'acc-1',
        } as any,
        {
          _id: 'tx-b',
          amount: 80,
          type: 'deposit',
          status: 'completed',
          description: 'Small salary',
          createdAt: '2026-03-12T10:00:00.000Z',
          toAccountId: 'acc-1',
        } as any,
        {
          _id: 'tx-c',
          amount: 400,
          type: 'deposit',
          status: 'confirmed',
          description: 'Salary bonus',
          createdAt: '2026-02-10T10:00:00.000Z',
          toAccountId: 'acc-2',
        } as any,
      ]);

      component.searchQuery = 'salary';
      component.selectedStatus = 'confirmed';
      component.selectedAccountId = 'acc-1';
      component.startDate = '2026-03-01';
      component.endDate = '2026-03-31';
      component.minAmount = 100;
      component.maxAmount = 300;

      component.applyClientFilters();

      expect(component.filteredTransactions().map((tx: any) => tx._id)).toEqual(['tx-a']);
    });
  });

  describe('PDF Statement Export', () => {
    it('should show success toast when exporting', () => {
      component.exportStatementPdf();
      expect(toastServiceMock.success).toHaveBeenCalledWith('Statement PDF exported.');
    });
  });
});
