/**
 * E2E Smoke Tests for BankApp UI
 * Covers user critical journeys: login, transfer verify, account creation, card lock, support ticket, loan payment
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials (should be set via environment in CI)
const TEST_USER = {
  email: process.env.E2E_USER_EMAIL || 'test-user@bank.com',
  password: process.env.E2E_USER_PASSWORD || 'TestPassword123!',
};

const TEST_ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@bank.com',
  password: process.env.E2E_ADMIN_PASSWORD || 'AdminPassword123!',
};

// Helper to login
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

// Helper to logout
async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('**/login');
}

test.describe('Smoke Suite - User Critical Journeys', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests sequentially for shared state

  test('01 - Login Journey', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Verify login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Attempt login with test credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Verify redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await expect(page.locator('[data-testid="user-dashboard"]')).toBeVisible();
    
    // Verify auth token stored
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(authToken).toBeTruthy();
  });

  test('02 - Dashboard - Accounts and Transactions', async ({ page }) => {
    // Login first
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Verify dashboard elements
    await expect(page.locator('[data-testid="accounts-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-transactions"]')).toBeVisible();
    
    // Navigate to accounts
    await page.click('[data-testid="nav-accounts"]');
    await page.waitForURL('**/accounts**');
    await expect(page.locator('[data-testid="accounts-list"]')).toBeVisible();
    
    // Navigate to transactions
    await page.click('[data-testid="nav-transactions"]');
    await page.waitForURL('**/transactions**');
    await expect(page.locator('[data-testid="transactions-list"]')).toBeVisible();
  });

  test('03 - Transfer Verify Journey', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to transfers
    await page.click('[data-testid="nav-transfers"]');
    await page.waitForURL('**/transfers**');
    
    // Verify transfer form elements
    await expect(page.locator('[data-testid="transfer-form"]')).toBeVisible();
    await expect(page.locator('select[name="fromAccount"]')).toBeVisible();
    await expect(page.locator('input[name="amount"]')).toBeVisible();
    
    // Initiate external transfer (triggers verification)
    await page.selectOption('select[name="fromAccount"]', { index: 0 });
    await page.fill('input[name="toAccount"]', '9876543210');
    await page.fill('input[name="amount"]', '100');
    await page.fill('input[name="description"]', 'E2E Test Transfer');
    await page.check('input[name="type"][value="external"]');
    
    // Submit transfer request
    await page.click('button[data-testid="submit-transfer"]');
    
    // Verify verification modal appears
    await expect(page.locator('[data-testid="verification-modal"]')).toBeVisible({ timeout: 10000 });
    
    // Enter verification code (mock code for testing)
    await page.fill('input[data-testid="verification-code"]', '123456');
    await page.click('button[data-testid="verify-transfer"]');
    
    // Verify success message
    await expect(page.locator('text=Transfer verified')).toBeVisible({ timeout: 10000 });
  });

  test('04 - Account Creation Journey', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to open account
    await page.click('[data-testid="nav-open-account"]');
    await page.waitForURL('**/open-account**');
    
    // Verify form elements
    await expect(page.locator('[data-testid="open-account-form"]')).toBeVisible();
    
    // Fill account creation form
    await page.fill('input[name="fullName"]', 'E2E Test User');
    await page.fill('input[name="email"]', `e2e-test-${Date.now()}@test.com`);
    await page.fill('input[name="phone"]', '1234567890');
    await page.selectOption('select[name="accountType"]', 'checking');
    await page.fill('input[name="initialDeposit"]', '100');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success (redirect to accounts or success message)
    await expect(page.locator('text=Account created')).toBeVisible({ timeout: 15000 });
  });

  test('05 - Card Lock Journey', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to cards
    await page.click('[data-testid="nav-cards"]');
    await page.waitForURL('**/cards**');
    
    // Verify cards list
    await expect(page.locator('[data-testid="cards-list"]')).toBeVisible();
    
    // Find first card and click freeze toggle
    const firstCard = page.locator('[data-testid="card-item"]').first();
    await expect(firstCard).toBeVisible();
    
    const freezeButton = firstCard.locator('button[data-testid="freeze-toggle"]');
    const isFrozen = await freezeButton.getAttribute('data-frozen');
    
    // Toggle freeze state
    await freezeButton.click();
    
    // Verify state changed
    const newState = await freezeButton.getAttribute('data-frozen');
    expect(newState).not.toBe(isFrozen);
    
    // Verify toast notification
    await expect(page.locator('text=Card')).toBeVisible({ timeout: 5000 });
  });

  test('06 - Support Ticket Journey', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to support
    await page.click('[data-testid="nav-support"]');
    await page.waitForURL('**/support**');
    
    // Verify support page
    await expect(page.locator('[data-testid="support-form"]')).toBeVisible();
    
    // Create new ticket
    await page.fill('input[name="subject"]', 'E2E Test Ticket');
    await page.fill('textarea[name="message"]', 'This is an automated e2e test ticket');
    await page.click('button[type="submit"]');
    
    // Verify ticket created
    await expect(page.locator('text=Ticket created')).toBeVisible({ timeout: 10000 });
    
    // Navigate to ticket detail
    await page.click('[data-testid="ticket-item"]:first-child');
    await expect(page.locator('[data-testid="ticket-detail"]')).toBeVisible();
    
    // Add reply
    await page.fill('textarea[data-testid="reply-input"]', 'E2E test reply');
    await page.click('button[data-testid="send-reply"]');
    
    // Verify reply added
    await expect(page.locator('text=E2E test reply')).toBeVisible({ timeout: 5000 });
  });

  test('07 - Loan Payment Journey', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to loans
    await page.click('[data-testid="nav-loans"]');
    await page.waitForURL('**/loans**');
    
    // Verify loans page
    await expect(page.locator('[data-testid="loans-section"]')).toBeVisible();
    
    // Check for active loans
    const activeLoans = page.locator('[data-testid="active-loan"]');
    const loanCount = await activeLoans.count();
    
    if (loanCount > 0) {
      // Click on first active loan
      await activeLoans.first().click();
      
      // Verify loan detail
      await expect(page.locator('[data-testid="loan-detail"]')).toBeVisible();
      
      // Click make payment
      await page.click('button[data-testid="make-payment"]');
      
      // Fill payment amount
      await page.fill('input[name="paymentAmount"]', '100');
      await page.selectOption('select[name="paymentAccount"]', { index: 0 });
      
      // Submit payment
      await page.click('button[type="submit"]');
      
      // Verify payment success
      await expect(page.locator('text=Payment successful')).toBeVisible({ timeout: 10000 });
    } else {
      // Skip if no active loans
      test.skip();
    }
  });

  test('08 - Logout Journey', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Verify logged in state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Logout
    await logout(page);
    
    // Verify redirected to login
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Verify token cleared
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(authToken).toBeNull();
  });
});

test.describe('Smoke Suite - Admin Critical Journeys', () => {
  test('01 - Admin Login and Dashboard', async ({ page }) => {
    // Navigate to admin login
    await page.goto('/admin/login');
    
    // Login as admin
    await page.fill('input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    
    // Verify redirect to admin dashboard
    await page.waitForURL('**/admin/dashboard**', { timeout: 15000 });
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    
    // Verify metrics visible
    await expect(page.locator('[data-testid="metrics-section"]')).toBeVisible();
  });

  test('02 - Admin Transfer Request Management', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard**');
    
    // Navigate to transfer requests
    await page.click('[data-testid="nav-transfer-requests"]');
    await page.waitForURL('**/admin/transfer-requests**');
    
    // Verify transfer requests list
    await expect(page.locator('[data-testid="transfer-requests-list"]')).toBeVisible();
    
    // Check for pending requests
    const pendingRequest = page.locator('[data-testid="pending-transfer"]').first();
    if (await pendingRequest.isVisible()) {
      // Approve first pending request
      await pendingRequest.locator('button[data-testid="approve-transfer"]').click();
      await expect(page.locator('text=Transfer approved')).toBeVisible({ timeout: 5000 });
    }
  });

  test('03 - Admin Card Request Management', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard**');
    
    // Navigate to card requests
    await page.click('[data-testid="nav-card-requests"]');
    await page.waitForURL('**/admin/card-requests**');
    
    // Verify card requests list
    await expect(page.locator('[data-testid="card-requests-list"]')).toBeVisible();
  });

  test('04 - Admin Support Ticket Management', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', TEST_ADMIN.email);
    await page.fill('input[type="password"]', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard**');
    
    // Navigate to support tickets
    await page.click('[data-testid="nav-support-tickets"]');
    await page.waitForURL('**/admin/support**');
    
    // Verify support tickets list
    await expect(page.locator('[data-testid="support-tickets-list"]')).toBeVisible();
    
    // Check for open tickets
    const openTicket = page.locator('[data-testid="open-ticket"]').first();
    if (await openTicket.isVisible()) {
      // Click to view ticket
      await openTicket.click();
      await expect(page.locator('[data-testid="ticket-detail"]')).toBeVisible();
      
      // Add admin reply
      await page.fill('textarea[data-testid="admin-reply"]', 'E2E admin test reply');
      await page.click('button[data-testid="send-reply"]');
      await expect(page.locator('text=Reply sent')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Smoke Suite - Error Handling', () => {
  test('Invalid login shows error', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Verify error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 });
    
    // Verify still on login page
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Protected route redirects to login when unauthenticated', async ({ page }) => {
    // Clear any existing auth
    await page.evaluate(() => localStorage.clear());
    
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Verify redirect to login
    await page.waitForURL('**/login**', { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Session expiry handles gracefully', async ({ page }) => {
    // Login
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Clear auth token to simulate expiry
    await page.evaluate(() => localStorage.removeItem('auth_token'));
    
    // Try to access protected route
    await page.goto('/accounts');
    
    // Verify redirect to login
    await page.waitForURL('**/login**', { timeout: 10000 });
  });
});

test.describe('Smoke Suite - Card PIN Security', () => {
  test.describe.configure({ mode: 'serial' });

  test('01 - Cards page requires PIN setup for first-time users', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to cards page
    await page.goto('/user/cards');
    
    // Should show PIN setup modal if no PIN is set
    const pinSetupModal = page.locator('app-pin-setup-modal');
    const pinEntryModal = page.locator('app-pin-entry-modal');
    
    // Either setup or entry modal should appear
    await expect(pinSetupModal.or(pinEntryModal)).toBeVisible({ timeout: 5000 });
  });

  test('02 - PIN Setup Journey', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to cards page
    await page.goto('/user/cards');
    
    // Wait for PIN modal
    await page.waitForSelector('app-pin-setup-modal, app-pin-entry-modal', { timeout: 5000 });
    
    const pinSetupModal = page.locator('app-pin-setup-modal');
    const isVisible = await pinSetupModal.isVisible();
    
    if (isVisible) {
      // Enter PIN step 1
      await pinSetupModal.locator('button:has-text("1")').click();
      await pinSetupModal.locator('button:has-text("2")').click();
      await pinSetupModal.locator('button:has-text("3")').click();
      await pinSetupModal.locator('button:has-text("4")').click();
      
      // Click continue
      await pinSetupModal.locator('button:has-text("Continue")').click();
      
      // Confirm PIN step 2
      await pinSetupModal.locator('button:has-text("1")').click();
      await pinSetupModal.locator('button:has-text("2")').click();
      await pinSetupModal.locator('button:has-text("3")').click();
      await pinSetupModal.locator('button:has-text("4")').click();
      
      // Click confirm
      await pinSetupModal.locator('button:has-text("Confirm")').click();
      
      // Verify success
      await expect(page.locator('text=PIN set successfully')).toBeVisible({ timeout: 5000 });
    } else {
      // PIN already set, skip this test
      console.log('PIN already set, skipping setup test');
    }
  });

  test('03 - PIN Entry Journey', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Clear PIN session to force re-entry
    await page.evaluate(() => sessionStorage.removeItem('cardPinToken'));
    
    // Navigate to cards page
    await page.goto('/user/cards');
    
    // Should show PIN entry modal
    const pinEntryModal = page.locator('app-pin-entry-modal');
    await expect(pinEntryModal).toBeVisible({ timeout: 5000 });
    
    // Enter correct PIN
    await pinEntryModal.locator('button:has-text("1")').click();
    await pinEntryModal.locator('button:has-text("2")').click();
    await pinEntryModal.locator('button:has-text("3")').click();
    await pinEntryModal.locator('button:has-text("4")').click();
    
    // Click verify
    await pinEntryModal.locator('button:has-text("Verify")').click();
    
    // Verify success and modal closes
    await expect(pinEntryModal).not.toBeVisible({ timeout: 5000 });
    
    // Cards content should be visible
    await expect(page.locator('text=My Cards')).toBeVisible();
  });

  test('04 - Incorrect PIN Handling', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Clear PIN session
    await page.evaluate(() => sessionStorage.removeItem('cardPinToken'));
    
    // Navigate to cards page
    await page.goto('/user/cards');
    
    const pinEntryModal = page.locator('app-pin-entry-modal');
    await expect(pinEntryModal).toBeVisible({ timeout: 5000 });
    
    // Enter wrong PIN
    await pinEntryModal.locator('button:has-text("9")').click();
    await pinEntryModal.locator('button:has-text("9")').click();
    await pinEntryModal.locator('button:has-text("9")').click();
    await pinEntryModal.locator('button:has-text("9")').click();
    
    // Click verify
    await pinEntryModal.locator('button:has-text("Verify")').click();
    
    // Verify error message
    await expect(pinEntryModal.locator('text=Incorrect PIN')).toBeVisible({ timeout: 5000 });
    
    // Modal should remain open
    await expect(pinEntryModal).toBeVisible();
  });

  test('05 - PIN Change Journey', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Navigate to cards page (should have PIN session from previous test)
    await page.goto('/user/cards');
    
    // Wait for page to load
    await page.waitForSelector('text=My Cards', { timeout: 10000 });
    
    // Click Change PIN button
    await page.click('button:has-text("Change PIN")');
    
    // PIN entry modal should appear for verification
    const pinEntryModal = page.locator('app-pin-entry-modal');
    const isEntryVisible = await pinEntryModal.isVisible().catch(() => false);
    
    if (isEntryVisible) {
      // Enter current PIN
      await pinEntryModal.locator('button:has-text("1")').click();
      await pinEntryModal.locator('button:has-text("2")').click();
      await pinEntryModal.locator('button:has-text("3")').click();
      await pinEntryModal.locator('button:has-text("4")').click();
      await pinEntryModal.locator('button:has-text("Verify")').click();
      
      // Wait for modal to close
      await expect(pinEntryModal).not.toBeVisible({ timeout: 5000 });
    }
    
    // Cards page should be accessible
    await expect(page.locator('text=My Cards')).toBeVisible();
  });

  test('06 - PIN Session Expiry', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Set a PIN session
    await page.goto('/user/cards');
    await page.waitForSelector('text=My Cards', { timeout: 10000 });
    
    // Clear PIN session to simulate expiry
    await page.evaluate(() => sessionStorage.removeItem('cardPinToken'));
    
    // Refresh page
    await page.reload();
    
    // Should show PIN entry modal again
    const pinEntryModal = page.locator('app-pin-entry-modal');
    await expect(pinEntryModal).toBeVisible({ timeout: 5000 });
  });

  test('07 - PIN Lockout After Failed Attempts', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    
    // Clear PIN session
    await page.evaluate(() => sessionStorage.removeItem('cardPinToken'));
    
    // Navigate to cards page
    await page.goto('/user/cards');
    
    const pinEntryModal = page.locator('app-pin-entry-modal');
    await expect(pinEntryModal).toBeVisible({ timeout: 5000 });
    
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await pinEntryModal.locator('button:has-text("9")').click();
      await pinEntryModal.locator('button:has-text("9")').click();
      await pinEntryModal.locator('button:has-text("9")').click();
      await pinEntryModal.locator('button:has-text("9")').click();
      await pinEntryModal.locator('button:has-text("Verify")').click();
      
      // Wait for error
      await page.waitForTimeout(500);
    }
    
    // Should show lockout message
    await expect(pinEntryModal.locator('text=/locked|too many/i')).toBeVisible({ timeout: 5000 });
  });
});
