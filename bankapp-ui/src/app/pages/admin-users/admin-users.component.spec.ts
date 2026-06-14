/**
 * Integration Tests for AdminUsersComponent
 * Flow B: Admin User Management - List, Search, Filter, Delete
 * Uses REAL services with HTTP mocking for true integration testing.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AdminUsersComponent } from './admin-users.component';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { UsersService, UserResponse } from '../../services/users/users.service';

describe('AdminUsersComponent Integration - Flow B', () => {
  let component: AdminUsersComponent;
  let fixture: ComponentFixture<AdminUsersComponent>;
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
      _id: 'user-3',
      name: 'Bob Wilson',
      email: 'bob@test.com',
      role: 'user',
      status: 'inactive',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
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

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
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
    fixture = TestBed.createComponent(AdminUsersComponent);
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
    it('should load users list on init', async () => {
      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.users().length).toBe(4);
    });

    it('should set default status for users without status', async () => {
      const usersWithoutStatus = [
        {
          _id: 'user-1',
          name: 'John Doe',
          email: 'john@test.com',
          role: 'user',
          createdAt: new Date().toISOString(),
        },
      ];

      const req = httpMock.expectOne('/api/users');
      req.flush(usersWithoutStatus);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.users()[0].status).toBe('active');
    });

    it('should handle empty users list', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush([]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.users().length).toBe(0);
    });

    it('should handle load error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error');

      const req = httpMock.expectOne('/api/users');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch users', expect.anything());
    });
  });

  describe('User Metrics', () => {
    it('should calculate correct metrics from users', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      const metrics = component.metrics();
      expect(metrics.total).toBe(4);
      expect(metrics.active).toBe(3); // 3 active (user-1, user-2, admin-1)
      expect(metrics.admin).toBe(1); // 1 admin
    });

    it('should calculate newToday correctly', async () => {
      const today = new Date().toISOString();
      const usersWithToday = [
        ...mockUsers,
        {
          _id: 'user-4',
          name: 'New User',
          email: 'new@test.com',
          role: 'user',
          status: 'active',
          createdAt: today,
        },
      ];

      const req = httpMock.expectOne('/api/users');
      req.flush(usersWithToday);

      await fixture.whenStable();
      fixture.detectChanges();

      // At least the new user should be counted
      expect(component.metrics().newToday).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Search Functionality', () => {
    it('should filter users by name', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.searchQuery.set('John');
      fixture.detectChanges();

      const filtered = component.filteredUsers();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('John Doe');
    });

    it('should filter users by email', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.searchQuery.set('jane@test.com');
      fixture.detectChanges();

      const filtered = component.filteredUsers();
      expect(filtered.length).toBe(1);
      expect(filtered[0].email).toBe('jane@test.com');
    });

    it('should be case-insensitive for search', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.searchQuery.set('JOHN');
      fixture.detectChanges();

      const filtered = component.filteredUsers();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('John Doe');
    });

    it('should return empty array for no matches', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.searchQuery.set('nonexistent');
      fixture.detectChanges();

      expect(component.filteredUsers().length).toBe(0);
    });

    it('should handle onSearchInput event', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      const event = { target: { value: 'Jane' } };
      component.onSearchInput(event);
      fixture.detectChanges();

      expect(component.searchQuery()).toBe('Jane');
      expect(component.filteredUsers().length).toBe(1);
    });
  });

  describe('Filter by Role', () => {
    it('should filter to show only customers', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.filterType.set('user');
      fixture.detectChanges();

      const filtered = component.filteredUsers();
      expect(filtered.length).toBe(3);
      expect(filtered.every((u) => u.role === 'user')).toBe(true);
    });

    it('should filter to show only admins', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.filterType.set('admin');
      fixture.detectChanges();

      const filtered = component.filteredUsers();
      expect(filtered.length).toBe(1);
      expect(filtered[0].role).toBe('admin');
    });

    it('should show all users when filter is all', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.filterType.set('all');
      fixture.detectChanges();

      expect(component.filteredUsers().length).toBe(4);
    });
  });

  describe('Combined Search and Filter', () => {
    it('should combine search and filter correctly', async () => {
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.searchQuery.set('john');
      component.filterType.set('user');
      fixture.detectChanges();

      const filtered = component.filteredUsers();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('John Doe');
      expect(filtered[0].role).toBe('user');
    });
  });

  describe('Delete User', () => {
    it('should delete user successfully', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'success');

      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.deleteUser('user-2');

      const deleteReq = httpMock.expectOne('/api/users/user-2');
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.success).toHaveBeenCalledWith('User deleted successfully');
      expect(component.users().length).toBe(3);
      expect(component.users().find((u) => u._id === 'user-2')).toBeUndefined();
    });

    it('should not delete if confirmation is cancelled', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.deleteUser('user-1');

      // No DELETE request should be made
      httpMock.expectNone('/api/users/user-1');
      expect(component.users().length).toBe(4);
    });

    it('should handle delete error', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(toastService, 'error');

      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      component.deleteUser('user-1');

      const deleteReq = httpMock.expectOne('/api/users/user-1');
      deleteReq.flush(
        { message: 'Cannot delete user with active accounts' },
        { status: 400, statusText: 'Bad Request' },
      );

      await fixture.whenStable();
      fixture.detectChanges();

      expect(toastService.error).toHaveBeenCalledWith('Cannot delete user with active accounts');
      expect(component.users().length).toBe(4); // User still in list
    });
  });

  describe('Navigation Items', () => {
    it('should have correct nav items configured', async () => {
      // Handle the HTTP request made during init
      const req = httpMock.expectOne('/api/users');
      req.flush(mockUsers);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.navItems.length).toBe(4);
      expect(component.navItems[0].route).toBe('/admin/dashboard');
      expect(component.navItems[1].route).toBe('/admin/users');
      expect(component.navItems[2].route).toBe('/admin/transfer-requests');
      expect(component.navItems[3].route).toBe('/admin/support-messages');
    });
  });
});
