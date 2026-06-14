// Mock auth middleware for tests
let mockUserRole = 'user';

const setMockUserRole = (role) => {
  mockUserRole = role;
};

const protect = (req, res, next) => {
  req.user = { _id: '507f1f77bcf86cd799439011', role: mockUserRole };
  next();
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

module.exports = {
  protect,
  admin,
  setMockUserRole
};
