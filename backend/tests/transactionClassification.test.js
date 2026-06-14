const Transaction = require('../models/transaction');

describe('Transaction classification safeguards', () => {
  it('rejects zero or negative amounts at transaction creation', async () => {
    await expect(
      Transaction.createTransaction({
        accountId: '507f1f77bcf86cd799439011',
        type: 'deposit',
        amount: 0,
        userId: '507f1f77bcf86cd799439012',
      }),
    ).rejects.toThrow('Amount must be a positive number');

    await expect(
      Transaction.createTransaction({
        accountId: '507f1f77bcf86cd799439011',
        type: 'withdrawal',
        amount: -10,
        userId: '507f1f77bcf86cd799439012',
      }),
    ).rejects.toThrow('Amount must be a positive number');
  });
});
