/**
 * Integration Tests for AdminCreateUserComponent
 * Flow F: Admin User Creation - Form Validation, Submission, Navigation
 * Uses REAL services with HTTP mocking for true integration testing.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AdminCreateUserComponent } from './admin-create-user.component';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { UsersService } from '../../services/users/users.service';

describe('AdminCreateUserComponent Integration - Flow F', () => {
  let component: AdminCreateUserComponent;
  let fixture: ComponentFixture<AdminCreateUserComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let toastService: ToastService;

  const mockAdminUser = {
    _id: 'admin-1',
    name: 'Admin User',
    email: 'admin@bank.com',
    role: 'admin',
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminCreateUserComponent, ReactiveFormsModule],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    toastService = TestBed.inject(ToastService);

    // Set up real AuthService state for admin
    (authService as any).currentUser.set(mockAdminUser);
    (authService as any).token.set('admin-token');
    (authService as any).isAuthenticated.set(true);

    // Create component
    fixture = TestBed.createComponent(AdminCreateUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values', () => {
      expect(component.userForm).toBeDefined();
      expect(component.userForm.get('name')?.value).toBe('');
      expect(component.userForm.get('email')?.value).toBe('');
      expect(component.userForm.get('password')?.value).toBe('');
      expect(component.userForm.get('role')?.value).toBe('user');
    });

    it('should have required validators on name field', () => {
      const nameControl = component.userForm.get('name');
      nameControl?.setValue('');
      expect(nameControl?.invalid).toBe(true);
      expect(nameControl?.errors?.['required']).toBe(true);
    });

    it('should have email validator on email field', () => {
      const emailControl = component.userForm.get('email');
      emailControl?.setValue('invalid-email');
      expect(emailControl?.invalid).toBe(true);
      expect(emailControl?.errors?.['email']).toBe(true);
    });

    it('should have minLength validator on password field', () => {
      const passwordControl = component.userForm.get('password');
      passwordControl?.setValue('12345');
      expect(passwordControl?.invalid).toBe(true);
      expect(passwordControl?.errors?.['minlength']).toBeTruthy();
    });

    it('should have required validator on role field', () => {
      const roleControl = component.userForm.get('role');
      roleControl?.setValue('');
      expect(roleControl?.invalid).toBe(true);
    });
  });

  describe('Form Validation', () => {
    it('should be valid with correct data', () => {
      component.userForm.setValue({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'password123',
        role: 'user',
      });
      expect(component.userForm.valid).toBe(true);
    });

    it('should be invalid with empty name', () => {
      component.userForm.patchValue({
        name: '',
        email: 'john@test.com',
        password: 'password123',
        role: 'user',
      });
      expect(component.userForm.invalid).toBe(true);
    });

    it('should be invalid with invalid email', () => {
      component.userForm.patchValue({
        name: 'John Doe',
        email: 'invalid',
        password: 'password123',
        role: 'user',
      });
      expect(component.userForm.invalid).toBe(true);
    });

    it('should be invalid with short password', () => {
      component.userForm.patchValue({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'short',
        role: 'user',
      });
      expect(component.userForm.invalid).toBe(true);
    });

    it('should allow admin role selection', () => {
      component.userForm.patchValue({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'adminpass123',
        role: 'admin',
      });
      expect(component.userForm.valid).toBe(true);
      expect(component.userForm.get('role')?.value).toBe('admin');
    });
  });

  describe('Submit - Success Flow', () => {
    it('should not submit if form is invalid', () => {
      component.userForm.patchValue({
        name: '',
        email: '',
        password: '',
        role: '',
      });

      component.onSubmit();

      httpMock.expectNone('/api/users');
    });

    it('should create user successfully', async () => {
      const router = TestBed.inject(Router) as Router;
      const routerSpy = vi.spyOn(router, 'navigate');
      vi.spyOn(toastService, 'success');

      component.userForm.setValue({
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
        role: 'user',
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
        role: 'user',
      });

      req.flush({
        _id: 'user-new',
        name: 'New User',
        email: 'newuser@test.com',
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isSubmitting).toBe(false);
      expect(toastService.success).toHaveBeenCalledWith('User created successfully');
      expect(routerSpy).toHaveBeenCalledWith(['/admin/users']);
    });

    it('should show loading state during submission', async () => {
      component.userForm.setValue({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123',
        role: 'user',
      });

      component.onSubmit();
      expect(component.isSubmitting).toBe(true);

      const req = httpMock.expectOne('/api/users');
      req.flush({ _id: 'user-test' });

      await fixture.whenStable();
      expect(component.isSubmitting).toBe(false);
    });
  });

  describe('Submit - Error Flow', () => {
    it('should handle creation error with message', async () => {
      component.userForm.setValue({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123',
        role: 'user',
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/users');
      req.flush({ message: 'Email already exists' }, { status: 400, statusText: 'Bad Request' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isSubmitting).toBe(false);
      expect(component.errorMsg).toBe('Email already exists');
    });

    it('should handle creation error without message', async () => {
      component.userForm.setValue({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123',
        role: 'user',
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/users');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isSubmitting).toBe(false);
      expect(component.errorMsg).toBe('Failed to create user. Please try again.');
    });

    it('should handle validation error from server', async () => {
      component.userForm.setValue({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123',
        role: 'user',
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/users');
      req.flush({ message: 'Invalid email format' }, { status: 400, statusText: 'Bad Request' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.errorMsg).toBe('Invalid email format');
    });

    it('should clear error message on new submission', async () => {
      // First submission with error
      component.userForm.setValue({
        name: 'Test User',
        email: 'existing@test.com',
        password: 'password123',
        role: 'user',
      });

      component.onSubmit();

      const req1 = httpMock.expectOne('/api/users');
      req1.flush({ message: 'Email exists' }, { status: 400, statusText: 'Bad Request' });

      await fixture.whenStable();
      expect(component.errorMsg).toBe('Email exists');

      // Second submission - should clear error
      component.userForm.patchValue({ email: 'new@test.com' });
      component.onSubmit();

      // Error should be cleared at start of submission
      expect(component.errorMsg).toBe('');

      const req2 = httpMock.expectOne('/api/users');
      req2.flush({ _id: 'user-new' });

      await fixture.whenStable();
    });
  });

  describe('Admin Role Creation', () => {
    it('should create admin user successfully', async () => {
      const router = TestBed.inject(Router) as Router;
      const routerSpy = vi.spyOn(router, 'navigate');
      vi.spyOn(toastService, 'success');

      component.userForm.setValue({
        name: 'New Admin',
        email: 'newadmin@bank.com',
        password: 'adminpass123',
        role: 'admin',
      });

      component.onSubmit();

      const req = httpMock.expectOne('/api/users');
      expect(req.request.body.role).toBe('admin');

      req.flush({
        _id: 'admin-new',
        name: 'New Admin',
        email: 'newadmin@bank.com',
        role: 'admin',
        status: 'active',
      });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.success).toHaveBeenCalledWith('User created successfully');
      expect(routerSpy).toHaveBeenCalledWith(['/admin/users']);
    });
  });
});
