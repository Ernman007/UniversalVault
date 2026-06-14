# Backend Tests

This directory contains tests for the banking system backend API.

## Test Structure

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test API endpoints with Supertest
- **End-to-End Tests**: Test complete flows across multiple endpoints

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/auth.test.js

# Run with coverage report
npm test -- --coverage
```

## Test Files

- `health.test.js` - Basic health check endpoint test
- `auth.test.js` - Authentication endpoints (login, logout, forgot-password)
- `accounts.test.js` - Account management endpoints
- `transactions.test.js` - Transaction processing endpoints
- `notifications.test.js` - User notification endpoints
- `users.test.js` - User management endpoints
- `supportTicket.test.js` - Support ticket system endpoints
- `activity.test.js` - Activity logging endpoints
- `settings.test.js` - User and system settings endpoints

## Mocking Strategy

Tests use Jest mocks to avoid database calls and external dependencies:

1. **Auth Middleware**: Mocked to bypass authentication
2. **Controllers**: Mocked to return predefined responses
3. **External Services**: Mocked to simulate successful operations

## Known Issues

1. Some controller modules may not exist yet and need to be created:
   - `settingsController.js`
   - `activityController.js`

2. Auth tests need improved mocking for:
   - User model
   - bcrypt password comparison

## Test Coverage

Current test coverage is focused on API endpoint behavior rather than implementation details. Future improvements will include more granular unit tests for services and utilities.

## Adding New Tests

When adding new tests:

1. Create a new test file named after the controller
2. Mock the auth middleware
3. Mock the controller methods
4. Write tests for each endpoint
5. Run the tests to verify they pass

See existing test files for examples of the pattern to follow.
