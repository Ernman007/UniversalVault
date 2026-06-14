const RequestCard = require('../models/requestCard');
const Account = require('../models/account');
const {
  createCardRequest,
  updateCardRequestStatus
} = require('../controllers/requestCardController');

jest.mock('../models/requestCard', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  prototype: { save: jest.fn() }
}));

jest.mock('../models/account', () => ({
  findOne: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../controllers/notificationController', () => ({
  createNotification: jest.fn()
}));

jest.mock('../services/cacheService', () => ({
  invalidateByPrefix: jest.fn()
}));

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('requestCardController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createCardRequest', () => {
    it('returns field-level errors for invalid payload', async () => {
      const req = { body: { accountId: 'bad-id', cardType: 'bitcoin' } };
      const res = buildRes();

      await createCardRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          errors: expect.objectContaining({
            accountId: expect.any(String),
            cardType: expect.any(String)
          })
        })
      );
    });

    it('returns 404 when account not found or not owned', async () => {
      Account.findOne.mockResolvedValueOnce(null);
      const req = {
        body: { accountId: '507f1f77bcf86cd799439011', cardType: 'debit' },
        user: { id: '507f1f77bcf86cd799439011' }
      };
      const res = buildRes();

      await createCardRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ACCOUNT_NOT_FOUND' })
      );
    });

    it('returns existing record for idempotent retry with x-idempotency-key', async () => {
      Account.findOne.mockResolvedValueOnce({ _id: '507f1f77bcf86cd799439011' });
      RequestCard.findOne.mockResolvedValueOnce({ _id: 'existing-req', cardType: 'debit' });
      const req = {
        body: { accountId: '507f1f77bcf86cd799439011', cardType: 'debit' },
        get: jest.fn().mockReturnValue('idem-key-abc'),
        user: { id: '507f1f77bcf86cd799439011' }
      };
      const res = buildRes();

      await createCardRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'existing-req' })
      );
    });
  });

  describe('updateCardRequestStatus', () => {
    it('rejects invalid ObjectId with 400', async () => {
      const req = { params: { id: 'not-valid' }, body: { status: 'approved' } };
      const res = buildRes();

      await updateCardRequestStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'VALIDATION_ERROR' })
      );
    });

    it('returns 404 when request not found', async () => {
      RequestCard.findById.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce(null)
      });
      const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        body: { status: 'approved' }
      };
      const res = buildRes();

      await updateCardRequestStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
