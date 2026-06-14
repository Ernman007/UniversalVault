export interface DirectionalTransaction {
  amount: number;
  type?: string;
  isUserSender?: boolean;
  isUserReceiver?: boolean;
}

const normalizedType = (tx: DirectionalTransaction): string => (tx.type || '').toLowerCase();

export const isIncomingTransaction = (tx: DirectionalTransaction): boolean => {
  const type = normalizedType(tx);

  if (type === 'deposit' || type === 'refund' || type === 'interest' || type === 'transfer_in')
    return true;
  if (
    type === 'withdrawal' ||
    type === 'card_purchase' ||
    type === 'fee' ||
    type === 'card' ||
    type === 'debit' ||
    type === 'transfer_out'
  )
    return false;
  if (type === 'transfer' || type === 'payment') {
    if (tx.isUserSender === true) return false;
    if (tx.isUserReceiver === true) return true;
    return false;
  }

  if (tx.isUserSender === true) return false;
  if (tx.isUserReceiver === true) return true;

  return tx.amount >= 0;
};

export const isExpenseTransaction = (tx: DirectionalTransaction): boolean =>
  !isIncomingTransaction(tx);

export const isIncomeTransaction = (tx: DirectionalTransaction): boolean =>
  isIncomingTransaction(tx);

export const getSignedAmount = (tx: DirectionalTransaction): number => {
  const absolute = Math.abs(tx.amount);
  return isIncomingTransaction(tx) ? absolute : -absolute;
};
