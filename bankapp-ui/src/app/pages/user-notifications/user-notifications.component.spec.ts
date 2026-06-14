/**
 * Integration Tests for UserNotificationsComponent
 * Flow F: Notifications
 * Uses REAL services with HTTP mocking for true integration testing.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { runInInjectionContext, Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { UserNotificationsComponent } from './user-notifications.component';
import { AuthService } from '../../services/auth/auth.service';
import { ToastService } from '../../services/notification/toast.service';
import { SocketService } from '../../services/socket/socket.service';

describe('UserNotificationsComponent Integration - Flow F', () => {
  let component: UserNotificationsComponent;
  let fixture: ComponentFixture<UserNotificationsComponent>;
  let httpMock: HttpTestingController;
  let socketService: SocketService;
  let toastService: ToastService;
  let injector: Injector;

  const mockUser = { _id: 'user-1', name: 'John Doe', email: 'john@test.com', role: 'user' };

  const mockNotifications = [
    {
      _id: 'notif-1',
      user: 'user-1',
      type: 'success',
      message: 'Transfer completed',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'notif-2',
      user: 'user-1',
      type: 'warning',
      message: 'New login detected',
      isRead: true,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'notif-3',
      user: 'user-1',
      type: 'info',
      message: 'Your statement is ready',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [UserNotificationsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    socketService = TestBed.inject(SocketService);
    toastService = TestBed.inject(ToastService);
    injector = TestBed.inject(Injector);

    // Set up real AuthService state
    const authService = TestBed.inject(AuthService);
    (authService as any).currentUser.set(mockUser);
    (authService as any).token.set('test-token');
    (authService as any).isAuthenticated.set(true);

    // Create component
    fixture = TestBed.createComponent(UserNotificationsComponent);
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
    it('should load notifications on init', async () => {
      const req = httpMock.expectOne('/api/notifications');
      expect(req.request.method).toBe('GET');
      req.flush(mockNotifications);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.notifications().length).toBe(3);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle empty notifications', async () => {
      const req = httpMock.expectOne('/api/notifications');
      req.flush([]);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.notifications().length).toBe(0);
    });
  });

  describe('Realtime Notifications', () => {
    it('should merge socket notifications with API notifications', async () => {
      const req = httpMock.expectOne('/api/notifications');
      req.flush(mockNotifications);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      // Simulate realtime notification via real SocketService signal
      socketService.notifications.set([
        {
          _id: 'notif-4',
          message: 'New realtime notification',
          type: 'info',
          createdAt: new Date().toISOString(),
        },
      ]);

      // Trigger the effect-based update in component
      component.realtimeTrigger.update((v) => v + 1);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.realtimeNotifications.length).toBe(4);
      expect(component.realtimeNotifications[0]._id).toBe('notif-4');
    });
  });

  describe('Mark as Read', () => {
    it('should mark single notification as read', async () => {
      const req = httpMock.expectOne('/api/notifications');
      req.flush(mockNotifications);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      component.markAsRead('notif-1');

      const markReq = httpMock.expectOne('/api/notifications/notif-1/read');
      expect(markReq.request.method).toBe('PUT');
      markReq.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      const notif = component.notifications().find((n) => n._id === 'notif-1');
      expect(notif?.isRead).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const req = httpMock.expectOne('/api/notifications');
      req.flush(mockNotifications);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      vi.spyOn(toastService, 'success');
      component.markAllAsRead();

      const markAllReq = httpMock.expectOne('/api/notifications/mark-all-read');
      expect(markAllReq.request.method).toBe('PUT');
      markAllReq.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(toastService.success).toHaveBeenCalledWith('All notifications marked as read');
      expect(component.notifications().every((n) => n.isRead)).toBe(true);
    });
  });

  describe('Delete Notification', () => {
    it('should delete notification from list', async () => {
      const req = httpMock.expectOne('/api/notifications');
      req.flush(mockNotifications);

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      component.deleteNotif('notif-2');

      const deleteReq = httpMock.expectOne('/api/notifications/notif-2');
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush({ success: true });

      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.notifications().length).toBe(2);
      expect(component.notifications().find((n) => n._id === 'notif-2')).toBeUndefined();
    });
  });
});
