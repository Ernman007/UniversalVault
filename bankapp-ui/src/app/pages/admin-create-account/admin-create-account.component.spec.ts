/**
 * Integration Tests for AdminCreateAccountComponent
 * Flow G: Admin Account Creation - Form, Pending Data, User+Account Creation
 * Uses REAL services with HTTP mocking for true integration testing.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AdminCreateAccountComponent } from './admin-create-account.component';
import { AdminService } from '../../services/admin/admin.service';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { PendingAccountService } from '../../services/pending-account/pending-account.service';

describe('AdminCreateAccountComponent Integration - Flow G', () => {
  let component: AdminCreateAccountComponent;
  let fixture: ComponentFixture<AdminCreateAccountComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let toastService: ToastService;
  let pendingAccountService: PendingAccountService;

  const mockAdminUser = {
    _id: 'admin-1',
    name: 'Admin User',
    email: 'admin@bank.com',
    role: 'admin',
  };

  const mockPendingData = {
    name: 'Pending User',
    email: 'pending@test.com',
    phone: '1234567890',
    address: '123 Main St',
    dob: '1990-01-15',
    password: 'tempPass123',
    accountType: 'checking',
    supportMessageId: 'msg-123',
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminCreateAccountComponent, ReactiveFormsModule],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    toastService = TestBed.inject(ToastService);
    pendingAccountService = TestBed.inject(PendingAccountService);

    // Set up real AuthService state for admin
    (authService as any).currentUser.set(mockAdminUser);
    (authService as any).token.set('admin-token');
    (authService as any).isAuthenticated.set(true);

    // Create component
    fixture = TestBed.createComponent(AdminCreateAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    pendingAccountService.clearPendingData();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values', () => {
      expect(component.accountForm).toBeDefined();
      expect(component.accountForm.get('name')?.value).toBe('');
      expect(component.accountForm.get('email')?.value).toBe('');
      expect(component.accountForm.get('phone')?.value).toBe('');
      expect(component.accountForm.get('type')?.value).toBe('checking');
      expect(component.accountForm.get('initialDeposit')?.value).toBe(0);
    });

    it('should have required validators on name field', () => {
      const nameControl = component.accountForm.get('name');
      nameControl?.setValue('');
      expect(nameControl?.invalid).toBe(true);
      expect(nameControl?.errors?.['required']).toBe(true);
    });

    it('should have minLength validator on name field', () => {
      const nameControl = component.accountForm.get('name');
      nameControl?.setValue('AB');
      expect(nameControl?.invalid).toBe(true);
      expect(nameControl?.errors?.['minlength']).toBeTruthy();
    });

    it('should have email validator on email field', () => {
      const emailControl = component.accountForm.get('email');
      emailControl?.setValue('invalid-email');
      expect(emailControl?.invalid).toBe(true);
      expect(emailControl?.errors?.['email']).toBe(true);
    });

    it('should have required validator on phone field', () => {
      const phoneControl = component.accountForm.get('phone');
      phoneControl?.setValue('');
      expect(phoneControl?.invalid).toBe(true);
      expect(phoneControl?.errors?.['required']).toBe(true);
    });

    it('should have required validator on type field', () => {
      const typeControl = component.accountForm.get('type');
      typeControl?.setValue('');
      expect(typeControl?.invalid).toBe(true);
    });
  });

  describe('Account Types', () => {
    it('should have correct account types configured', () => {
      expect(component.accountTypes.length).toBe(3);
      expect(component.accountTypes[0].value).toBe('checking');
      expect(component.accountTypes[1].value).toBe('savings');
      expect(component.accountTypes[2].value).toBe('investment');
    });
  });

  describe('Pending Data Loading', () => {
    it('should load pending data from PendingAccountService', async () => {
      pendingAccountService.setPendingData(mockPendingData);

      // Re-create component to trigger ngOnInit
      fixture = TestBed.createComponent(AdminCreateAccountComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Wait for setTimeout in ngOnInit to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();

      expect(component.isFromRequest()).toBe(true);
      expect(component.pendingName()).toBe('Pending User');
      expect(component.pendingEmail()).toBe('pending@test.com');
      expect(component.accountForm.get('name')?.value).toBe('Pending User');
      expect(component.accountForm.get('email')?.value).toBe('pending@test.com');
      expect(component.accountForm.get('phone')?.value).toBe('1234567890');
    });

    it('should normalize date of birth for input', async () => {
      const dataWithIsoDate = {
        ...mockPendingData,
        dob: '1990-01-15T00:00:00.000Z',
      };
      pendingAccountService.setPendingData(dataWithIsoDate);

      fixture = TestBed.createComponent(AdminCreateAccountComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();

      expect(component.accountForm.get('dob')?.value).toBe('1990-01-15');
    });

    it('should not load data when no pending data exists', async () => {
      pendingAccountService.clearPendingData();

      fixture = TestBed.createComponent(AdminCreateAccountComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();

      expect(component.isFromRequest()).toBe(false);
      expect(component.pendingName()).toBe('');
      expect(component.pendingEmail()).toBe('');
    });
  });

  describe('Set Deposit Quick Actions', () => {
    it('should set deposit to $100', () => {
      component.setDeposit(100);
      expect(component.accountForm.get('initialDeposit')?.value).toBe(100);
    });

    it('should set deposit to $500', () => {
      component.setDeposit(500);
      expect(component.accountForm.get('initialDeposit')?.value).toBe(500);
    });

    it('should set deposit to $1000', () => {
      component.setDeposit(1000);
      expect(component.accountForm.get('initialDeposit')?.value).toBe(1000);
    });

    it('should set deposit to $5000', () => {
      component.setDeposit(5000);
      expect(component.accountForm.get('initialDeposit')?.value).toBe(5000);
    });

    it('should override previous deposit value', () => {
      component.setDeposit(100);
      component.setDeposit(5000);
      expect(component.accountForm.get('initialDeposit')?.value).toBe(5000);
    });
  });

  describe('Submit - Validation', () => {
    it('should not submit if form is invalid', () => {
      component.accountForm.patchValue({
        name: 'AB', // Too short
        email: 'invalid',
        phone: '',
        type: 'checking',
      });

      component.onSubmit();

      httpMock.expectNone('/api/admin/users/user-account');
    });

    it('should mark all controls as touched on invalid submit', () => {
      component.accountForm.patchValue({
        name: '',
        email: '',
        phone: '',
      });

      component.onSubmit();

      expect(component.accountForm.get('name')?.touched).toBe(true);
      expect(component.accountForm.get('email')?.touched).toBe(true);
      expect(component.accountForm.get('phone')?.touched).toBe(true);
    });
  });

  describe('Submit - Success Flow', () => {
    it('should create user with account successfully', async () => {
      const router = TestBed.inject(Router) as Router;
      const routerSpy = vi.spyOn(router, 'navigate');
      vi.spyOn(toastService, 'success');

      component.accountForm.setValue({
        name: 'New User',
        email: 'newuser@test.com',
        phone: '1234567890',
        dob: '1990-01-15',
        address: '123 Main St',
        password: 'customPassword123',
        type: 'checking',
        initialDeposit: 500,
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/admin/users/user-account');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'New User',
        email: 'newuser@test.com',
        password: 'customPassword123',
        phone: '1234567890',
        address: '123 Main St',
        dateOfBirth: '1990-01-15',
        accountType: 'checking',
        initialDeposit: 500,
      });

      req.flush({
        user: { _id: 'user-new', name: 'New User', email: 'newuser@test.com' },
        account: { _id: 'acc-new', accountNumber: '1234567890', type: 'checking', balance: 500 },
      });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.loading()).toBe(false);
      expect(toastService.success).toHaveBeenCalled();
      // Wait for 2000ms navigation timeout
      await new Promise((resolve) => setTimeout(resolve, 2100));
      expect(routerSpy).toHaveBeenCalledWith(['/admin/dashboard']);
    });

    it('should auto-generate password if not provided', async () => {
      component.accountForm.setValue({
        name: 'Auto Pass User',
        email: 'autopass@test.com',
        phone: '1234567890',
        dob: '',
        address: '',
        password: '', // Empty - should auto-generate
        type: 'savings',
        initialDeposit: 1000,
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/admin/users/user-account');
      const body = req.request.body;

      // Password should be auto-generated (starts with 'Bank' and ends with '!')
      expect(body.password).toMatch(/^Bank\d+!$/);
      expect(body.password.length).toBeGreaterThan(10);

      req.flush({ user: { _id: 'u1' }, account: { _id: 'a1' } });
      await fixture.whenStable();
    });

    it('should show loading state during submission', async () => {
      component.accountForm.setValue({
        name: 'Test User',
        email: 'test@test.com',
        phone: '1234567890',
        dob: '',
        address: '',
        password: 'password123',
        type: 'checking',
        initialDeposit: 100,
      });

      component.onSubmit();
      expect(component.loading()).toBe(true);

      const req = httpMock.expectOne('/api/admin/users/user-account');
      req.flush({ user: { _id: 'u1' }, account: { _id: 'a1' } });

      await fixture.whenStable();
      expect(component.loading()).toBe(false);
    });
  });

  describe('Submit - With Support Message Resolution', () => {
    it('should resolve support message after account creation', async () => {
      pendingAccountService.setPendingData(mockPendingData);

      // Re-create component to load pending data
      fixture = TestBed.createComponent(AdminCreateAccountComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Wait for setTimeout in ngOnInit
      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();

      component.accountForm.patchValue({
        name: 'Pending User',
        email: 'pending@test.com',
        phone: '1234567890',
        password: 'tempPass123',
      });

      component.onSubmit();

      // First request - create user with account
      const createReq = httpMock.expectOne('/api/admin/users/user-account');
      createReq.flush({ user: { _id: 'u1' }, account: { _id: 'a1' } });

      await fixture.whenStable();

      // Second request - resolve support message (nested subscription)
      const resolveReq = httpMock.expectOne('/api/support/msg-123');
      expect(resolveReq.request.method).toBe('PUT');
      expect(resolveReq.request.body).toEqual({ status: 'closed' });
      resolveReq.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(pendingAccountService.getPendingData()).toBeNull();
    });

    it('should handle support message resolution error gracefully', async () => {
      vi.spyOn(toastService, 'success');

      pendingAccountService.setPendingData(mockPendingData);

      fixture = TestBed.createComponent(AdminCreateAccountComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Wait for setTimeout in ngOnInit
      await new Promise((resolve) => setTimeout(resolve, 0));
      await fixture.whenStable();

      component.accountForm.patchValue({
        name: 'Pending User',
        email: 'pending@test.com',
        phone: '1234567890',
        password: 'tempPass123',
      });

      component.onSubmit();

      const createReq = httpMock.expectOne('/api/admin/users/user-account');
      createReq.flush({ user: { _id: 'u1' }, account: { _id: 'a1' } });

      await fixture.whenStable();

      const resolveReq = httpMock.expectOne('/api/support/msg-123');
      resolveReq.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

      await fixture.whenStable();
      fixture.detectChanges();

      // Should still show success with note about ticket
      expect(toastService.success).toHaveBeenCalledWith(
        expect.stringContaining('(Ticket not closed)'),
      );
      expect(pendingAccountService.getPendingData()).toBeNull();
    });
  });

  describe('Submit - Error Flow', () => {
    it('should handle creation error with message', async () => {
      vi.spyOn(toastService, 'error');

      component.accountForm.setValue({
        name: 'Test User',
        email: 'existing@test.com',
        phone: '1234567890',
        dob: '',
        address: '',
        password: 'password123',
        type: 'checking',
        initialDeposit: 100,
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/admin/users/user-account');
      req.flush(
        { message: 'Email already registered' },
        { status: 400, statusText: 'Bad Request' },
      );

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.loading()).toBe(false);
      expect(toastService.error).toHaveBeenCalledWith('Email already registered');
    });

    it('should handle creation error without message', async () => {
      vi.spyOn(toastService, 'error');

      component.accountForm.setValue({
        name: 'Test User',
        email: 'test@test.com',
        phone: '1234567890',
        dob: '',
        address: '',
        password: 'password123',
        type: 'checking',
        initialDeposit: 100,
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/admin/users/user-account');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.error).toHaveBeenCalledWith('Failed to create user and account');
    });
  });

  describe('Different Account Types', () => {
    it('should create savings account', async () => {
      const router = TestBed.inject(Router) as Router;
      vi.spyOn(router, 'navigate');

      component.accountForm.setValue({
        name: 'Savings User',
        email: 'savings@test.com',
        phone: '1234567890',
        dob: '',
        address: '',
        password: 'password123',
        type: 'savings',
        initialDeposit: 1000,
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/admin/users/user-account');
      expect(req.request.body.accountType).toBe('savings');
      req.flush({ user: { _id: 'u1' }, account: { _id: 'a1', type: 'savings' } });

      await fixture.whenStable();
    });

    it('should create investment account', async () => {
      const router = TestBed.inject(Router) as Router;
      vi.spyOn(router, 'navigate');

      component.accountForm.setValue({
        name: 'Investment User',
        email: 'invest@test.com',
        phone: '1234567890',
        dob: '',
        address: '',
        password: 'password123',
        type: 'investment',
        initialDeposit: 5000,
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/admin/users/user-account');
      expect(req.request.body.accountType).toBe('investment');
      expect(req.request.body.initialDeposit).toBe(5000);
      req.flush({ user: { _id: 'u1' }, account: { _id: 'a1', type: 'investment' } });

      await fixture.whenStable();
    });
  });

  describe('Zero Initial Deposit', () => {
    it('should allow zero initial deposit', async () => {
      const router = TestBed.inject(Router) as Router;
      vi.spyOn(router, 'navigate');

      component.accountForm.setValue({
        name: 'Zero Deposit User',
        email: 'zero@test.com',
        phone: '1234567890',
        dob: '',
        address: '',
        password: 'password123',
        type: 'checking',
        initialDeposit: 0,
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/admin/users/user-account');
      expect(req.request.body.initialDeposit).toBe(0);
      req.flush({ user: { _id: 'u1' }, account: { _id: 'a1', balance: 0 } });

      await fixture.whenStable();
    });
  });
});
