import { describe, expect, it } from 'vitest';

import {
  getSignedAmount,
  isExpenseTransaction,
  isIncomingTransaction,
  isIncomeTransaction,
} from './transaction-direction.util';

describe('transaction-direction.util', () => {
  it('classifies deposits as incoming even with conflicting sender/receiver flags', () => {
    const tx = {
      amount: 500,
      type: 'deposit',
      isUserSender: true,
      isUserReceiver: true,
    };

    expect(isIncomingTransaction(tx)).toBe(true);
    expect(isIncomeTransaction(tx)).toBe(true);
    expect(getSignedAmount(tx)).toBe(500);
  });

  it('classifies withdrawals as outgoing even with conflicting sender/receiver flags', () => {
    const tx = {
      amount: 500,
      type: 'withdrawal',
      isUserSender: false,
      isUserReceiver: true,
    };

    expect(isIncomingTransaction(tx)).toBe(false);
    expect(isExpenseTransaction(tx)).toBe(true);
    expect(getSignedAmount(tx)).toBe(-500);
  });

  it('uses user direction flags for transfer classification', () => {
    const incomingTransfer = {
      amount: 120,
      type: 'transfer',
      isUserSender: false,
      isUserReceiver: true,
    };
    const outgoingTransfer = {
      amount: 120,
      type: 'transfer',
      isUserSender: true,
      isUserReceiver: false,
    };

    expect(isIncomingTransaction(incomingTransfer)).toBe(true);
    expect(getSignedAmount(incomingTransfer)).toBe(120);
    expect(isIncomingTransaction(outgoingTransfer)).toBe(false);
    expect(getSignedAmount(outgoingTransfer)).toBe(-120);
  });

  it('uses user direction flags for payment classification', () => {
    const incomingPayment = {
      amount: 100,
      type: 'payment',
      isUserSender: false,
      isUserReceiver: true,
    };
    const outgoingPayment = {
      amount: 100,
      type: 'payment',
      isUserSender: true,
      isUserReceiver: false,
    };

    expect(isIncomingTransaction(incomingPayment)).toBe(true);
    expect(isIncomeTransaction(incomingPayment)).toBe(true);
    expect(isExpenseTransaction(incomingPayment)).toBe(false);
    expect(getSignedAmount(incomingPayment)).toBe(100);

    expect(isIncomingTransaction(outgoingPayment)).toBe(false);
    expect(isIncomeTransaction(outgoingPayment)).toBe(false);
    expect(isExpenseTransaction(outgoingPayment)).toBe(true);
    expect(getSignedAmount(outgoingPayment)).toBe(-100);
  });

  it('falls back to amount sign for unknown transaction types', () => {
    expect(
      getSignedAmount({
        amount: 42,
        type: 'unknown',
      }),
    ).toBe(42);

    expect(
      getSignedAmount({
        amount: -42,
        type: 'unknown',
      }),
    ).toBe(-42);
  });
});
