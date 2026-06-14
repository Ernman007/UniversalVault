/**
 * Integration Tests for AdminCardRequestsComponent
 * Flow D: Admin Card Request Management - List, Approve, Reject
 * Uses REAL services with HTTP mocking for true integration testing.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AdminCardRequestsComponent } from './admin-card-requests.component';
import { AdminService } from '../../services/admin/admin.service';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';

describe('AdminCardRequestsComponent Integration - Flow D', () => {
  let component: AdminCardRequestsComponent;
  let fixture: ComponentFixture<AdminCardRequestsComponent>;
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
    {
      _id: 'cr-3',
      account: { accountNumber: '1111111111' },
      cardType: 'debit',
      user: { name: 'Bob Wilson', email: 'bob@test.com' },
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminCardRequestsComponent],
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
    fixture = TestBed.createComponent(AdminCardRequestsComponent);
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
    it('should load card requests on init', async () => {
      const req = httpMock.expectOne('/api/card-requests/pending');
      expect(req.request.method).toBe('GET');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.requests().length).toBe(3);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle empty card requests list', async () => {
      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush([]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.requests().length).toBe(0);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle load error gracefully', async () => {
      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(component.requests().length).toBe(0);
    });
  });

  describe('Card Request Details Display', () => {
    it('should display correct card request details', async () => {
      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      const cardRequest = component.requests()[0];
      expect(cardRequest._id).toBe('cr-1');
      expect(cardRequest.cardType).toBe('debit');
      expect(cardRequest.account?.accountNumber).toBe('1234567890');
      expect(cardRequest.user?.name).toBe('John Doe');
      expect(cardRequest.user?.email).toBe('john@test.com');
    });

    it('should handle different card types', async () => {
      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      const cardTypes = component.requests().map((r) => r.cardType);
      expect(cardTypes).toContain('debit');
      expect(cardTypes).toContain('credit');
    });

    it('should handle missing account info gracefully', async () => {
      const requestWithMissingData = [
        {
          _id: 'cr-missing',
          cardType: 'debit',
          user: { name: 'Test User', email: 'test@test.com' },
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ];

      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(requestWithMissingData);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.requests().length).toBe(1);
      expect(component.requests()[0].account?.accountNumber).toBeUndefined();
    });
  });

  describe('Approve Card Request', () => {
    it('should approve card request successfully', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'success');

      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.approve('cr-1');

      const approveReq = httpMock.expectOne('/api/card-requests/cr-1');
      expect(approveReq.request.method).toBe('PUT');
      expect(approveReq.request.body).toEqual({ status: 'approved' });
      approveReq.flush({ success: true, status: 'approved' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.success).toHaveBeenCalledWith('Approved');
      expect(component.requests().length).toBe(2);
      expect(component.requests().find((r) => r._id === 'cr-1')).toBeUndefined();
    });

    it('should not approve if confirmation is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.approve('cr-1');

      httpMock.expectNone('/api/card-requests/cr-1');
      expect(component.requests().length).toBe(3);
    });

    it('should handle approve error', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'error');

      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.approve('cr-1');

      const approveReq = httpMock.expectOne('/api/card-requests/cr-1');
      approveReq.flush({ message: 'Account not found' }, { status: 404, statusText: 'Not Found' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.error).toHaveBeenCalledWith('Account not found');
      expect(component.requests().length).toBe(3); // Request still in list
    });
  });

  describe('Reject Card Request', () => {
    it('should reject card request successfully', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'success');

      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.reject('cr-2');

      const rejectReq = httpMock.expectOne('/api/card-requests/cr-2');
      expect(rejectReq.request.method).toBe('PUT');
      expect(rejectReq.request.body).toEqual({ status: 'rejected' });
      rejectReq.flush({ success: true, status: 'rejected' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.success).toHaveBeenCalledWith('Rejected');
      expect(component.requests().length).toBe(2);
      expect(component.requests().find((r) => r._id === 'cr-2')).toBeUndefined();
    });

    it('should not reject if confirmation is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.reject('cr-1');

      httpMock.expectNone('/api/card-requests/cr-1');
      expect(component.requests().length).toBe(3);
    });

    it('should handle reject error', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'error');

      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      component.reject('cr-1');

      const rejectReq = httpMock.expectOne('/api/card-requests/cr-1');
      rejectReq.flush(
        { message: 'Request already processed' },
        { status: 400, statusText: 'Bad Request' },
      );

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.error).toHaveBeenCalledWith('Request already processed');
      expect(component.requests().length).toBe(3);
    });
  });

  describe('Multiple Operations', () => {
    it('should handle sequential approve operations', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'success');

      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      // Approve first
      component.approve('cr-1');
      const approveReq1 = httpMock.expectOne('/api/card-requests/cr-1');
      approveReq1.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.requests().length).toBe(2);

      // Approve second
      component.approve('cr-2');
      const approveReq2 = httpMock.expectOne('/api/card-requests/cr-2');
      approveReq2.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.requests().length).toBe(1);
      expect(component.requests()[0]._id).toBe('cr-3');
    });

    it('should handle mixed approve and reject operations', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'success');

      const req = httpMock.expectOne('/api/card-requests/pending');
      req.flush(mockCardRequests);

      await fixture.whenStable();
      fixture.detectChanges();

      // Approve one
      component.approve('cr-1');
      const approveReq = httpMock.expectOne('/api/card-requests/cr-1');
      approveReq.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();

      // Reject another
      component.reject('cr-2');
      const rejectReq = httpMock.expectOne('/api/card-requests/cr-2');
      rejectReq.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.requests().length).toBe(1);
      expect(toastService.success).toHaveBeenCalledTimes(2);
    });
  });
});
