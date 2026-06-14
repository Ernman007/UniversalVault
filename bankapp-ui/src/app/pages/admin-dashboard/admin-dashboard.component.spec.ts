/**
 * Integration Tests for AdminDashboardComponent
 * Flow A: Admin Dashboard - Metrics and Navigation
 * Uses REAL services with HTTP mocking for true integration testing.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminService, AdminMetrics } from '../../services/admin/admin.service';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';

describe('AdminDashboardComponent Integration - Flow A', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
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

  const mockMetrics: AdminMetrics = {
    totalUsers: 150,
    totalBalance: 2500000,
    totalTransactions: 5000,
    pendingActions: 12,
    pendingTransfers: 5,
    pendingCards: 3,
    pendingSupport: 4,
    recentActivity: [
      { type: 'user_registered', message: 'New user John registered', timestamp: new Date() },
      { type: 'transfer', message: 'Transfer of $500 completed', timestamp: new Date() },
      { type: 'card_request', message: 'Card request from user Jane', timestamp: new Date() },
    ],
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
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
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;

    // Run detectChanges within injection context for effect() in ngOnInit to work
    runInInjectionContext(injector, () => {
      fixture.detectChanges();
    });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Initial Load', () => {
    it('should load dashboard metrics on init', async () => {
      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      expect(req.request.method).toBe('GET');
      req.flush(mockMetrics);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.metrics()).toEqual(mockMetrics);
      expect(component.metrics()?.totalUsers).toBe(150);
      expect(component.metrics()?.pendingActions).toBe(12);
    });

    it('should display correct pending action counts', async () => {
      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      req.flush(mockMetrics);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.metrics()?.pendingTransfers).toBe(5);
      expect(component.metrics()?.pendingCards).toBe(3);
      expect(component.metrics()?.pendingSupport).toBe(4);
    });

    it('should handle metrics load error', async () => {
      vi.spyOn(toastService, 'error');

      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastService.error).toHaveBeenCalledWith('Failed to load dashboard metrics');
    });
  });

  describe('Recent Activity Display', () => {
    it('should display recent activity items', async () => {
      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      req.flush(mockMetrics);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const activity = component.metrics()?.recentActivity;
      expect(activity?.length).toBe(3);
      expect(activity?.[0].type).toBe('user_registered');
      expect(activity?.[1].type).toBe('transfer');
      expect(activity?.[2].type).toBe('card_request');
    });

    it('should handle empty recent activity', async () => {
      const emptyMetrics = { ...mockMetrics, recentActivity: [] };

      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      req.flush(emptyMetrics);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.metrics()?.recentActivity?.length).toBe(0);
    });
  });

  describe('Navigation Items', () => {
    it('should have correct nav items configured', async () => {
      // Handle the HTTP request made during init
      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      req.flush(mockMetrics);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.navItems.length).toBe(4);
      expect(component.navItems[0].label).toBe('Dashboard');
      expect(component.navItems[0].route).toBe('/admin/dashboard');
      expect(component.navItems[1].label).toBe('Users');
      expect(component.navItems[1].route).toBe('/admin/users');
      expect(component.navItems[2].label).toBe('Requests');
      expect(component.navItems[2].route).toBe('/admin/transfer-requests');
      expect(component.navItems[3].label).toBe('Support');
      expect(component.navItems[3].route).toBe('/admin/support-messages');
    });
  });

  describe('Logout', () => {
    it('should call auth logout and navigate to login', async () => {
      // Handle the HTTP request made during init
      const initReq = httpMock.expectOne('/api/admin/dashboard/metrics');
      initReq.flush(mockMetrics);

      await fixture.whenStable();
      fixture.detectChanges();

      const router = TestBed.inject(Router) as Router;
      const routerSpy = vi.spyOn(router, 'navigate');

      component.logout();

      const logoutReq = httpMock.expectOne('/api/auth/logout');
      expect(logoutReq.request.method).toBe('GET');
      logoutReq.flush({ success: true });

      await fixture.whenStable();

      expect(authService.isAuthenticated()).toBe(false);
      expect(routerSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Metrics Calculation', () => {
    it('should correctly sum pending actions', async () => {
      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      req.flush(mockMetrics);

      await fixture.whenStable();
      fixture.detectChanges();

      const metrics = component.metrics();
      const expectedPending =
        metrics?.pendingTransfers! + metrics?.pendingCards! + metrics?.pendingSupport!;
      expect(metrics?.pendingActions).toBe(expectedPending);
    });

    it('should handle large balance amounts', async () => {
      const largeMetrics = {
        ...mockMetrics,
        totalBalance: 999999999.99,
      };

      const req = httpMock.expectOne('/api/admin/dashboard/metrics');
      req.flush(largeMetrics);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.metrics()?.totalBalance).toBe(999999999.99);
    });
  });
});
