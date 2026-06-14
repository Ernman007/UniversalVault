const supportMessageService = require('../services/supportMessageService');
const SupportMessage = require('../models/supportMessage');
const {
  createGuestSupportMessage,
  updateSupportMessage
} = require('../controllers/supportMessageController');

jest.mock('../services/supportMessageService', () => ({
  updateMessage: jest.fn()
}));

jest.mock('../models/supportMessage', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('supportMessageController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns validation errors for incomplete guest account-open payload', async () => {
    const req = {
      body: { email: 'bad-email' },
      files: null,
      get: jest.fn()
    };
    const res = buildRes();

    await createGuestSupportMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR'
      })
    );
  });

  it('returns 409 when a pending duplicate account-open request exists', async () => {
    SupportMessage.findOne
      .mockReturnValueOnce({
        sort: jest.fn().mockResolvedValueOnce({
          _id: 'existing-request-id'
        })
      });

    const req = {
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '1234567890',
        address: '123 Main Street',
        dob: '1990-01-01',
        password: 'Password1',
        accountType: 'savings',
        subject: 'Open account',
        message: 'Please open my account'
      },
      files: {
        image: {
          mimetype: 'image/png',
          size: 128,
          name: 'id.png',
          mv: jest.fn()
        }
      },
      get: jest.fn().mockReturnValue('')
    };
    const res = buildRes();

    await createGuestSupportMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'ACCOUNT_REQUEST_ALREADY_PENDING',
        existingRequestId: 'existing-request-id'
      })
    );
  });

  it('returns existing record for idempotent retries', async () => {
    SupportMessage.findOne.mockResolvedValueOnce({ _id: 'idem-id', email: 'jane@example.com' });

    const req = {
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '1234567890',
        address: '123 Main Street',
        dob: '1990-01-01',
        password: 'Password1',
        accountType: 'savings'
      },
      files: {
        image: {
          mimetype: 'image/png',
          size: 128,
          name: 'id.png',
          mv: jest.fn()
        }
      },
      get: jest.fn().mockReturnValue('idem-123')
    };
    const res = buildRes();

    await createGuestSupportMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'idem-id' }));
  });

  it('validates update payload and requires rejectionReason when rejected', async () => {
    const req = {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { status: 'rejected' },
      user: { _id: '507f1f77bcf86cd799439012' }
    };
    const res = buildRes();

    await updateSupportMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        errors: expect.objectContaining({
          rejectionReason: expect.any(String)
        })
      })
    );
  });

  it('updates support message with deterministic normalized payload', async () => {
    supportMessageService.updateMessage.mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439011',
      status: 'approved'
    });

    const req = {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { status: ' approved ', adminReply: ' done ' },
      user: { _id: '507f1f77bcf86cd799439012' }
    };
    const res = buildRes();

    await updateSupportMessage(req, res);

    expect(supportMessageService.updateMessage).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({
        status: 'approved',
        adminReply: 'done',
        resolvedBy: '507f1f77bcf86cd799439012'
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    );
  });
});
