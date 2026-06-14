/**
 * Integration Tests for UserSupportComponent
 * Flow G: Support & Ticketing
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { UserSupportComponent } from './user-support.component';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';

describe('UserSupportComponent Integration - Flow G', () => {
  let component: UserSupportComponent;
  let fixture: ComponentFixture<UserSupportComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  const mockUser = { _id: 'user-1', name: 'John Doe', email: 'john@test.com', role: 'user' };

  const mockTickets = [
    {
      _id: 'ticket-1',
      subject: 'Card not working',
      category: 'card',
      description: 'My card is declined',
      status: 'open',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'ticket-2',
      subject: 'Loan inquiry',
      category: 'loan',
      description: 'Question about rates',
      status: 'resolved',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [UserSupportComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);

    const authService = TestBed.inject(AuthService);
    (authService as any).currentUser.set(mockUser);
    (authService as any).token.set('test-token');
    (authService as any).isAuthenticated.set(true);

    fixture = TestBed.createComponent(UserSupportComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Initial Load', () => {
    it('should load user tickets on init', async () => {
      fixture.detectChanges();

      const req = httpMock.expectOne('/api/support/tickets');
      expect(req.request.method).toBe('GET');
      req.flush({ data: { tickets: mockTickets } });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.tickets().length).toBe(2);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle empty tickets list', async () => {
      fixture.detectChanges();

      const req = httpMock.expectOne('/api/support/tickets');
      req.flush({ tickets: [] });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.tickets().length).toBe(0);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle load error gracefully', async () => {
      vi.spyOn(toastService, 'error');

      fixture.detectChanges();

      const req = httpMock.expectOne('/api/support/tickets');
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.isLoading()).toBe(false);
      expect(component.loadError()).toBeTruthy();
    });
  });

  describe('Create Ticket', () => {
    it('should initialize form with default values', async () => {
      fixture.detectChanges();

      const req = httpMock.expectOne('/api/support/tickets');
      req.flush({ tickets: [] });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.ticketForm.get('category')?.value).toBe('technical');
      expect(component.ticketForm.get('subject')?.value).toBe('');
      expect(component.ticketForm.get('description')?.value).toBe('');
    });

    it('should validate required fields', async () => {
      fixture.detectChanges();

      const req = httpMock.expectOne('/api/support/tickets');
      req.flush({ tickets: [] });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.ticketForm.valid).toBe(false);

      component.ticketForm.patchValue({
        subject: 'Test subject',
        description: 'Test description',
        category: 'account',
      });

      expect(component.ticketForm.valid).toBe(true);
    });

    it('should create ticket successfully', async () => {
      vi.spyOn(toastService, 'success');

      fixture.detectChanges();

      const loadReq = httpMock.expectOne('/api/support/tickets');
      loadReq.flush({ tickets: [] });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      component.isCreating.set(true);
      component.ticketForm.patchValue({
        subject: 'Card issue',
        description: 'My card is not working',
        category: 'card',
      });

      component.createTicket();

      const createReq = httpMock.expectOne('/api/support/tickets');
      expect(createReq.request.method).toBe('POST');
      expect(createReq.request.body.subject).toBe('Card issue');
      expect(createReq.request.body.category).toBe('card');

      createReq.flush({ success: true, data: { _id: 'ticket-new' } });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      // Reload tickets
      const reloadReq = httpMock.expectOne('/api/support/tickets');
      reloadReq.flush({
        tickets: [
          {
            _id: 'ticket-new',
            subject: 'Card issue',
            category: 'card',
            description: 'My card is not working',
            status: 'open',
          },
        ],
      });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastService.success).toHaveBeenCalledWith('Ticket created successfully');
      expect(component.isCreating()).toBe(false);
    });

    it('should handle create ticket error', async () => {
      vi.spyOn(toastService, 'error');

      fixture.detectChanges();

      const loadReq = httpMock.expectOne('/api/support/tickets');
      loadReq.flush({ tickets: [] });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      component.isCreating.set(true);
      component.ticketForm.patchValue({
        subject: 'Test',
        description: 'Test description',
        category: 'technical',
      });

      component.createTicket();

      const createReq = httpMock.expectOne('/api/support/tickets');
      createReq.flush(
        { message: 'Rate limit exceeded' },
        { status: 429, statusText: 'Too Many Requests' },
      );

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastService.error).toHaveBeenCalled();
      expect(component.isSubmitting).toBe(false);
    });

    it('should not submit invalid form', async () => {
      fixture.detectChanges();

      const loadReq = httpMock.expectOne('/api/support/tickets');
      loadReq.flush({ tickets: [] });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      component.isCreating.set(true);
      component.ticketForm.patchValue({ subject: '' }); // Invalid
      component.createTicket();

      // No POST request should be made
      expect(
        httpMock.match('/api/support/tickets').filter((r) => r.request.method === 'POST').length,
      ).toBe(0);
    });
  });

  describe('UI State', () => {
    it('should toggle create mode', async () => {
      fixture.detectChanges();

      const req = httpMock.expectOne('/api/support/tickets');
      req.flush({ tickets: mockTickets });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.isCreating()).toBe(false);

      component.isCreating.set(true);
      expect(component.isCreating()).toBe(true);

      component.isCreating.set(false);
      expect(component.isCreating()).toBe(false);
    });
  });
});
