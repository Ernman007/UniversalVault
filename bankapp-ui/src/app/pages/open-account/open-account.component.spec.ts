/**
 * Integration Tests for OpenAccountComponent
 * Flow H: Open Account (Guest KYC)
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { OpenAccountComponent } from './open-account.component';
import { ToastService } from '../../services/notification/toast.service';

describe('OpenAccountComponent Integration - Flow H', () => {
  let component: OpenAccountComponent;
  let fixture: ComponentFixture<OpenAccountComponent>;
  let httpMock: HttpTestingController;
  let toastService: ToastService;
  let router: Router;

  beforeEach(async () => {
    // Mock FileReader for file upload tests
    class MockFileReader {
      result: string = 'data:image/jpeg;base64,test';
      onload: (() => void) | null = null;
      readAsDataURL() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    (globalThis as any).FileReader = MockFileReader;

    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [OpenAccountComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(OpenAccountComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Form Initialization', () => {
    it('should initialize form with empty values', () => {
      expect(component.accountForm).toBeDefined();
      expect(component.accountForm.get('name')?.value).toBe('');
      expect(component.accountForm.get('email')?.value).toBe('');
      expect(component.accountForm.get('accountType')?.value).toBe('');
    });

    it('should have required validators on mandatory fields', () => {
      const nameControl = component.accountForm.get('name');
      const emailControl = component.accountForm.get('email');
      const passwordControl = component.accountForm.get('password');
      const phoneControl = component.accountForm.get('phone');

      expect(nameControl?.hasError('required')).toBe(true);
      expect(emailControl?.hasError('required')).toBe(true);
      expect(passwordControl?.hasError('required')).toBe(true);
      expect(phoneControl?.hasError('required')).toBe(true);
    });

    it('should validate email format', () => {
      const emailControl = component.accountForm.get('email');

      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBe(true);

      emailControl?.setValue('valid@email.com');
      expect(emailControl?.hasError('email')).toBe(false);
    });

    it('should validate password strength', () => {
      const passwordControl = component.accountForm.get('password');

      passwordControl?.setValue('weak');
      expect(passwordControl?.hasError('pattern')).toBe(true);

      passwordControl?.setValue('Weakpass1');
      expect(passwordControl?.valid).toBe(true);
    });

    it('should validate phone number format', () => {
      const phoneControl = component.accountForm.get('phone');

      phoneControl?.setValue('123');
      expect(phoneControl?.hasError('pattern')).toBe(true);

      phoneControl?.setValue('1234567890');
      expect(phoneControl?.valid).toBe(true);
    });

    it('should validate name minimum length', () => {
      const nameControl = component.accountForm.get('name');

      nameControl?.setValue('ab');
      expect(nameControl?.hasError('minlength')).toBe(true);

      nameControl?.setValue('John Doe');
      expect(nameControl?.valid).toBe(true);
    });
  });

  describe('File Upload', () => {
    it('should handle valid image file selection', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [file] } };

      component.onFileSelected(event);

      expect(component.selectedFile).toBe(file);
    });

    it('should reject non-image files', () => {
      vi.spyOn(toastService, 'error');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const event = { target: { files: [file] } };

      component.onFileSelected(event);

      expect(toastService.error).toHaveBeenCalledWith('Please select a valid image file under 5MB');
      expect(component.selectedFile).toBeNull();
    });

    it('should remove image correctly', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      component.selectedFile = file;
      component.imagePreview = 'data:image/test';

      const event = { stopPropagation: vi.fn() } as any;
      component.removeImage(event);

      expect(component.selectedFile).toBeNull();
      expect(component.imagePreview).toBeNull();
      expect(component.accountForm.get('image')?.value).toBeNull();
    });
  });

  describe('Form Submission', () => {
    it('should not submit invalid form', async () => {
      component.accountForm.patchValue({
        name: '',
        email: 'invalid',
        password: 'weak',
      });

      component.onSubmit();

      expect(httpMock.match('/api/support/open-account').length).toBe(0);
    });

    it('should submit valid form with FormData', async () => {
      vi.spyOn(toastService, 'success');
      const routerSpy = vi.spyOn(router, 'navigate');

      // Fill form with valid data
      component.accountForm.patchValue({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'Password1',
        phone: '1234567890',
        address: '123 Main Street',
        dob: '1990-01-01',
        accountType: 'savings',
      });

      // Add a file
      const file = new File(['test'], 'id.jpg', { type: 'image/jpeg' });
      component.selectedFile = file;
      component.accountForm.patchValue({ image: file });

      component.onSubmit();

      const req = httpMock.expectOne('/api/support/guest');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);

      req.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastService.success).toHaveBeenCalled();
    });

    it('should handle submission error', async () => {
      vi.spyOn(toastService, 'error');

      component.accountForm.patchValue({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'Password1',
        phone: '1234567890',
        address: '123 Main Street',
        dob: '1990-01-01',
        accountType: 'savings',
      });

      const file = new File(['test'], 'id.jpg', { type: 'image/jpeg' });
      component.selectedFile = file;
      component.accountForm.patchValue({ image: file });

      component.onSubmit();

      const req = httpMock.expectOne('/api/support/guest');
      req.flush({ message: 'Email already exists' }, { status: 400, statusText: 'Bad Request' });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastService.error).toHaveBeenCalled();
      expect(component.loading).toBe(false);
    });
  });

  describe('Account Types', () => {
    it('should accept savings account type', () => {
      component.accountForm.patchValue({ accountType: 'savings' });
      expect(component.accountForm.get('accountType')?.valid).toBe(true);
    });

    it('should accept checking account type', () => {
      component.accountForm.patchValue({ accountType: 'checking' });
      expect(component.accountForm.get('accountType')?.valid).toBe(true);
    });

    it('should accept investment account type', () => {
      component.accountForm.patchValue({ accountType: 'investment' });
      expect(component.accountForm.get('accountType')?.valid).toBe(true);
    });
  });
});
