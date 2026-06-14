/**
 * Integration Tests for BankApp Admin Flows
 * These tests verify that admin components, services, and HTTP work together correctly
 * Uses REAL services with HTTP mocking for true integration testing
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AdminService, AdminMetrics } from './app/services/admin/admin.service';
import { AuthService } from './app/services/auth/auth.service';
import { UsersService, UserResponse } from './app/services/users/users.service';

describe('BankApp Admin Integration Tests - Admin Flows', () => {
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let adminService: AdminService;
  let usersService: UsersService;

  const mockAdminUser = {
    _id: 'admin-1',
    name: 'Admin User',
    email: 'admin@bank.com',
    role: 'admin',
    status: 'active',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        AdminService,
        UsersService,
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    adminService = TestBed.inject(AdminService);
    usersService = TestBed.inject(UsersService);

    // Set up admin auth state
    (authService as any).currentUser.set(mockAdminUser);
    (authService as any).token.set('admin-jwt-token');
    (authService as any).isAuthenticated.set(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  describe('Flow A: Admin Dashboard Metrics', () => {
    it('should fetch dashboard metrics on admin login', () => {
      const mockMetrics: AdminMetrics = {
        totalUsers: 150,
        totalBalance: 2500000,
        totalTransactions: 5000,
        totalTickets: 42,
        pendingActions: 12,
        pendingTransfers: 5,
        pendingCards: 3,
        pendingSupport: 4,
        pendingAccountRequests: 2,
        recentActivity: [
          { type: 'user_registered', message: 'New user John registered', timestamp: new Date() },
          { type: 'transfer', message: 'Transfer of $500 completed', timestamp: new Date() },
          { type: 'card_request', message: 'Card request from user Jane', timestamp: new Date() },
        ],
      };

      adminService.getDashboardMetrics().subscribe((metrics) => {
        expect(metrics).toEqual(mockMetrics);
        expect(metrics.totalUsers).toBe(150);
        expect(metrics.pendingActions).toBe(12);
        expect(metrics.recentActivity.length).toBe(3);
      });

      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      expect(req.request.method).toBe('GET');
      req.flush(mockMetrics);
    });

    it('should handle metrics fetch error gracefully', () => {
      adminService.getDashboardMetrics().subscribe({
        next: () => expect.fail('Should have thrown error'),
        error: (err) => {
          expect(err.status).toBe(403);
        },
      });

      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Flow B: Transfer Request Management', () => {
    it('should fetch pending transfer requests', () => {
      const mockTransferRequests = [
        {
          _id: 'tr-1',
          fromAccount: { accountNumber: '1234567890' },
          toAccount: '0987654321',
          amount: 1000,
          status: 'pending',
          bankName: 'Local Bank',
          reason: 'Rent payment',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'tr-2',
          fromAccount: { accountNumber: '1111111111' },
          toAccount: '2222222222',
          amount: 500,
          status: 'pending',
          bankName: 'External Bank',
          createdAt: new Date().toISOString(),
        },
      ];

      adminService.getTransferRequests().subscribe((requests) => {
        expect(requests.length).toBe(2);
        expect(requests[0].amount).toBe(1000);
        expect(requests[1].status).toBe('pending');
      });

      const req = httpMock.expectOne('/api/transfer-requests');
      expect(req.request.method).toBe('GET');
      req.flush(mockTransferRequests);
    });

    it('should approve a transfer request', () => {
      const transferId = 'tr-1';

      adminService.approveTransfer(transferId).subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`/api/transfer-requests/${transferId}/manage`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'approved' });
      req.flush({ success: true, status: 'approved' });
    });

    it('should reject a transfer request with reason', () => {
      const transferId = 'tr-2';
      const reason = 'Insufficient funds verification failed';

      adminService.rejectTransfer(transferId, reason).subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`/api/transfer-requests/${transferId}/manage`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'rejected', reason });
      req.flush({ success: true, status: 'rejected' });
    });

    it('should reject a transfer request without reason', () => {
      const transferId = 'tr-3';

      adminService.rejectTransfer(transferId).subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`/api/transfer-requests/${transferId}/manage`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'rejected' });
      req.flush({ success: true, status: 'rejected' });
    });
  });

  describe('Flow C: Card Request Management', () => {
    it('should fetch pending card requests', () => {
      const mockCardRequests = [
        {
          _id: 'cr-1',
          account: { accountNumber: '1234567890' },
          cardType: 'debit',
          user: { name: 'John Doe', email: 'john@test.com' },
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'cr-2',
          account: { accountNumber: '0987654321' },
          cardType: 'credit',
          user: { name: 'Jane Smith', email: 'jane@test.com' },
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ];

      adminService.getCardRequests().subscribe((requests) => {
        expect(requests.length).toBe(2);
        expect(requests[0].cardType).toBe('debit');
        expect(requests[1].user.name).toBe('Jane Smith');
      });

      const req = httpMock.expectOne('/api/card-requests/pending');
      expect(req.request.method).toBe('GET');
      req.flush(mockCardRequests);
    });

    it('should approve a card request', () => {
      const requestId = 'cr-1';

      adminService.approveCardRequest(requestId).subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`/api/card-requests/${requestId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'approved' });
      req.flush({ success: true, status: 'approved' });
    });

    it('should reject a card request', () => {
      const requestId = 'cr-2';

      adminService.rejectCardRequest(requestId).subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`/api/card-requests/${requestId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'rejected' });
      req.flush({ success: true, status: 'rejected' });
    });
  });

  describe('Flow D: Support Ticket Management', () => {
    it('should fetch support tickets', () => {
      const mockTickets = [
        {
          _id: 'ticket-1',
          subject: 'Account Opening Request',
          name: 'New User',
          email: 'newuser@test.com',
          message: 'I want to open a savings account',
          status: 'open',
          messageType: 'account-request',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'ticket-2',
          subject: 'Transfer Issue',
          name: 'John Doe',
          email: 'john@test.com',
          message: 'My transfer is stuck',
          status: 'in-progress',
          createdAt: new Date().toISOString(),
        },
      ];

      adminService.getSupportTickets().subscribe((tickets) => {
        expect(tickets.length).toBe(2);
        expect(tickets[0].subject).toBe('Account Opening Request');
      });

      const req = httpMock.expectOne('/api/support/tickets');
      expect(req.request.method).toBe('GET');
      req.flush(mockTickets);
    });

    it('should fetch support messages', () => {
      const mockMessages = [
        {
          _id: 'msg-1',
          name: 'Alice',
          email: 'alice@test.com',
          message: 'Need help with login',
          status: 'open',
          createdAt: new Date().toISOString(),
        },
      ];

      adminService.getSupportMessages().subscribe((messages) => {
        expect(messages.length).toBe(1);
        expect(messages[0].name).toBe('Alice');
      });

      const req = httpMock.expectOne('/api/support');
      expect(req.request.method).toBe('GET');
      req.flush(mockMessages);
    });

    it('should get ticket messages by ID', () => {
      const ticketId = 'ticket-1';
      const mockTicketDetail = {
        _id: ticketId,
        subject: 'Account Opening Request',
        messages: [
          { from: 'user', text: 'I want to open an account', timestamp: new Date() },
          { from: 'admin', text: 'Sure, let me help you', timestamp: new Date() },
        ],
      };

      adminService.getTicketMessages(ticketId).subscribe((detail) => {
        expect(detail.messages.length).toBe(2);
      });

      const req = httpMock.expectOne(`/api/support/tickets/${ticketId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTicketDetail);
    });

    it('should reply to a ticket', () => {
      const ticketId = 'ticket-1';
      const replyMessage = 'Your account has been created successfully!';

      adminService.replyToTicket(ticketId, replyMessage).subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne('/api/support/messages');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        ticketId,
        body: replyMessage,
      });
      req.flush({ success: true });
    });

    it('should reply to a legacy support message', () => {
      const messageId = 'msg-legacy-1';
      const replyMessage = 'We are reviewing your request.';

      adminService.replyToSupportMessage(messageId, replyMessage).subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`/api/support/${messageId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        status: 'in-progress',
        adminReply: replyMessage,
      });
      req.flush({ success: true });
    });

    it('should resolve a support message', () => {
      const messageId = 'msg-1';

      adminService.resolveMessage(messageId).subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`/api/support/${messageId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'closed' });
      req.flush({ success: true });
    });

    it('should resolve a ticket', () => {
      const ticketId = 'ticket-1';

      adminService.resolveTicket(ticketId).subscribe((response) => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`/api/support/tickets/${ticketId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'resolved' });
      req.flush({ success: true });
    });
  });

  describe('Flow E: User Management', () => {
    it('should fetch all users', () => {
      const mockUsers: UserResponse[] = [
        {
          _id: 'user-1',
          name: 'John Doe',
          email: 'john@test.com',
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@test.com',
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'admin-1',
          name: 'Admin User',
          email: 'admin@bank.com',
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];

      usersService.getUsers().subscribe((users) => {
        expect(users.length).toBe(3);
        expect(users.filter((u) => u.role === 'admin').length).toBe(1);
      });

      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });

    it('should create a new user', () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
        role: 'user',
      };

      const createdUser: UserResponse = {
        _id: 'user-3',
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      usersService.createUser(newUser).subscribe((user) => {
        expect(user._id).toBe('user-3');
        expect(user.name).toBe(newUser.name);
      });

      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newUser);
      req.flush(createdUser);
    });

    it('should update a user', () => {
      const userId = 'user-1';
      const updateData = { name: 'John Updated', status: 'inactive' };

      usersService.updateUser(userId, updateData).subscribe((user) => {
        expect(user.name).toBe('John Updated');
      });

      const req = httpMock.expectOne(`/api/users/${userId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush({
        _id: userId,
        name: 'John Updated',
        email: 'john@test.com',
        role: 'user',
        status: 'inactive',
        createdAt: new Date().toISOString(),
      });
    });

    it('should delete a user', () => {
      const userId = 'user-2';

      usersService.deleteUser(userId).subscribe((response) => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`/api/users/${userId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  describe('Flow F: Create User with Account', () => {
    it('should create user with account in single operation', () => {
      const userData = {
        name: 'Complete User',
        email: 'complete@test.com',
        password: 'tempPassword123!',
        phone: '1234567890',
        address: '123 Main St, City, State',
        dateOfBirth: '1990-01-15',
        accountType: 'checking',
        initialDeposit: 500,
      };

      const createdResult = {
        user: {
          _id: 'user-new',
          name: userData.name,
          email: userData.email,
        },
        account: {
          _id: 'acc-new',
          accountNumber: '1234567890',
          type: 'checking',
          balance: 500,
        },
      };

      adminService.createUserWithAccount(userData).subscribe((result) => {
        expect(result.user._id).toBe('user-new');
        expect(result.account.balance).toBe(500);
      });

      const req = httpMock.expectOne('/api/admin/users/user-account');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      req.flush(createdResult);
    });

    it('should handle user creation with auto-generated password', () => {
      const userData = {
        name: 'Auto Pass User',
        email: 'autopass@test.com',
        accountType: 'savings',
        initialDeposit: 1000,
      };

      adminService.createUserWithAccount(userData).subscribe((result) => {
        expect(result).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/admin/users/user-account');
      expect(req.request.method).toBe('POST');
      req.flush({ user: { _id: 'user-auto' }, account: { _id: 'acc-auto' } });
    });
  });

  describe('Flow G: Admin Authentication Guard', () => {
    it('should verify admin role is set correctly', () => {
      expect(authService.currentUser()?.role).toBe('admin');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should clear admin state on logout', () => {
      authService.logout();

      const logoutReq = httpMock.expectOne('/api/auth/logout');
      logoutReq.flush({ success: true });

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.currentUser()).toBeNull();
    });
  });
});
