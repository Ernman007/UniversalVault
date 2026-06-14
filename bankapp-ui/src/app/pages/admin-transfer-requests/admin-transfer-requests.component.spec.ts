/**
 * Integration Tests for AdminTransferRequestsComponent
 * Flow C: Admin Transfer Request Management - List, Approve, Reject
 * Uses REAL services with HTTP mocking for true integration testing.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AdminTransferRequestsComponent } from './admin-transfer-requests.component';
import { AdminService } from '../../services/admin/admin.service';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';

describe('AdminTransferRequestsComponent Integration - Flow C', () => {
  let component: AdminTransferRequestsComponent;
  let fixture: ComponentFixture<AdminTransferRequestsComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let toastService: ToastService;
  let injector: Injector;

  const mockAdminUser = {
    _id: 'admin-1',
    name: 'Admin User',
    email: 'admin@bank.com',
    role: 'admin',
  };

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
    {
      _id: 'tr-3',
      fromAccount: { accountNumber: '3333333333' },
      toAccount: '4444444444',
      amount: 2500,
      status: 'approved', // Already approved
      bankName: 'Local Bank',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminTransferRequestsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    toastService = TestBed.inject(ToastService);
    injector = TestBed.inject(Injector);

    // Set up real AuthService state for admin
    (authService as any).currentUser.set(mockAdminUser);
    (authService as any).token.set('admin-token');
    (authService as any).isAuthenticated.set(true);

    // Create component
    fixture = TestBed.createComponent(AdminTransferRequestsComponent);
    component = fixture.componentInstance;

    // Run detectChanges within injection context
    runInInjectionContext(injector, () => {
      fixture.detectChanges();
    });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Initial Load', () => {
    it('should load transfer requests on init', async () => {
      const req = httpMock.expectOne('/api/transfer-requests');
      expect(req.request.method).toBe('GET');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      // Only pending requests should be shown
      expect(component.requests().length).toBe(2);
      expect(component.isLoading()).toBe(false);
    });

    it('should filter to show only pending requests', async () => {
      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      const allPending = component.requests().every((r) => r.status === 'pending');
      expect(allPending).toBe(true);
    });

    it('should handle empty transfer requests list', async () => {
      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush([]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.requests().length).toBe(0);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle load error gracefully', async () => {
      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(component.requests().length).toBe(0);
    });
  });

  describe('Approve Transfer', () => {
    it('should approve transfer successfully', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'success');

      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.approve('tr-1');

      const approveReq = httpMock.expectOne('/api/transfer-requests/tr-1/manage');
      expect(approveReq.request.method).toBe('PUT');
      expect(approveReq.request.body).toEqual({ status: 'approved' });
      approveReq.flush({ success: true, status: 'approved' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.success).toHaveBeenCalledWith('Transfer approved successfully');
      expect(component.requests().length).toBe(1);
      expect(component.requests().find((r) => r._id === 'tr-1')).toBeUndefined();
    });

    it('should not approve if confirmation is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.approve('tr-1');

      httpMock.expectNone('/api/transfer-requests/tr-1/manage');
      expect(component.requests().length).toBe(2);
    });

    it('should handle approve error', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'error');

      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.approve('tr-1');

      const approveReq = httpMock.expectOne('/api/transfer-requests/tr-1/manage');
      approveReq.flush(
        { message: 'Insufficient funds' },
        { status: 400, statusText: 'Bad Request' },
      );

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.error).toHaveBeenCalledWith('Insufficient funds');
      expect(component.requests().length).toBe(2); // Request still in list
    });
  });

  describe('Reject Transfer - Modal Flow', () => {
    it('should open reject modal with correct request ID', async () => {
      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.openRejectModal('tr-1');

      expect(component.showRejectModal()).toBe(true);
      expect(component.selectedRequestId).toBe('tr-1');
      expect(component.rejectionReason).toBe('');
    });

    it('should close reject modal and reset state', async () => {
      // Handle the HTTP request made during init
      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.showRejectModal.set(true);
      component.selectedRequestId = 'tr-1';
      component.rejectionReason = 'Some reason';

      component.closeRejectModal();

      expect(component.showRejectModal()).toBe(false);
      expect(component.selectedRequestId).toBe('');
      expect(component.rejectionReason).toBe('');
    });

    it('should confirm reject with reason', async () => {
      vi.spyOn(toastService, 'success');

      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.selectedRequestId = 'tr-1';
      component.rejectionReason = 'Invalid account details';
      component.confirmReject();

      const rejectReq = httpMock.expectOne('/api/transfer-requests/tr-1/manage');
      expect(rejectReq.request.method).toBe('PUT');
      expect(rejectReq.request.body).toEqual({
        status: 'rejected',
        reason: 'Invalid account details',
      });
      rejectReq.flush({ success: true, status: 'rejected' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.success).toHaveBeenCalledWith('Transfer rejected');
      expect(component.showRejectModal()).toBe(false);
      expect(component.requests().length).toBe(1);
    });

    it('should not confirm reject without reason', async () => {
      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.selectedRequestId = 'tr-1';
      component.rejectionReason = '   '; // Empty/whitespace
      component.confirmReject();

      httpMock.expectNone('/api/transfer-requests/tr-1/manage');
    });

    it('should handle reject error', async () => {
      vi.spyOn(toastService, 'error');

      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.selectedRequestId = 'tr-1';
      component.rejectionReason = 'Test reason';
      component.confirmReject();

      const rejectReq = httpMock.expectOne('/api/transfer-requests/tr-1/manage');
      rejectReq.flush(
        { message: 'Request already processed' },
        { status: 400, statusText: 'Bad Request' },
      );

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.error).toHaveBeenCalledWith('Request already processed');
      expect(component.rejecting()).toBe(false);
    });

    it('should show loading state during rejection', async () => {
      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.selectedRequestId = 'tr-1';
      component.rejectionReason = 'Test reason';

      // Start reject but don't flush yet
      component.confirmReject();
      expect(component.rejecting()).toBe(true);

      const rejectReq = httpMock.expectOne('/api/transfer-requests/tr-1/manage');
      rejectReq.flush({ success: true });

      await fixture.whenStable();
      expect(component.rejecting()).toBe(false);
    });
  });

  describe('Navigation Items', () => {
    it('should have correct nav items configured', async () => {
      // Handle the HTTP request made during init
      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.navItems.length).toBe(4);
      expect(component.navItems[0].route).toBe('/admin/dashboard');
      expect(component.navItems[1].route).toBe('/admin/users');
      expect(component.navItems[2].route).toBe('/admin/transfer-requests');
      expect(component.navItems[3].route).toBe('/admin/support-messages');
    });
  });

  describe('Transfer Request Details Display', () => {
    it('should display correct transfer details', async () => {
      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(mockTransferRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      const transfer = component.requests()[0];
      expect(transfer.amount).toBe(1000);
      expect(transfer.fromAccount?.accountNumber).toBe('1234567890');
      expect(transfer.toAccount).toBe('0987654321');
      expect(transfer.bankName).toBe('Local Bank');
      expect(transfer.reason).toBe('Rent payment');
    });

    it('should handle missing optional fields', async () => {
      const minimalRequest = [
        {
          _id: 'tr-minimal',
          fromAccount: { accountNumber: '123456' },
          toAccount: 'external-acc',
          amount: 100,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ];

      const req = httpMock.expectOne('/api/transfer-requests');
      req.flush(minimalRequest);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.requests().length).toBe(1);
      expect(component.requests()[0].bankName).toBeUndefined();
      expect(component.requests()[0].reason).toBeUndefined();
    });
  });
});
