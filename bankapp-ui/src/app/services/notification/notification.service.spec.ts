/**
 * Unit Tests for NotificationService
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { NotificationService, NotificationResponse } from './notification.service';

describe('NotificationService Unit Tests', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  const mockNotifications: NotificationResponse[] = [
    {
      _id: 'notif-1',
      user: 'user-1',
      type: 'success',
      message: 'Test 1',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'notif-2',
      user: 'user-1',
      type: 'info',
      message: 'Test 2',
      isRead: true,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NotificationService],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNotifications', () => {
    it('should return an Observable of notifications (legacy array format)', () => {
      service.getNotifications().subscribe((notifications) => {
        // Handle both array and paginated response formats
        const notifArray = Array.isArray(notifications)
          ? notifications
          : (notifications as any).data;
        expect(notifArray.length).toBe(2);
        expect(notifArray).toEqual(mockNotifications);
      });

      const req = httpMock.expectOne('/api/notifications');
      expect(req.request.method).toBe('GET');
      req.flush(mockNotifications);
    });
  });

  describe('getNotificationById', () => {
    it('should return a single notification', () => {
      const mockNotif = mockNotifications[0];
      service.getNotificationById('notif-1').subscribe((notification) => {
        expect(notification).toEqual(mockNotif);
      });

      const req = httpMock.expectOne('/api/notifications/notif-1');
      expect(req.request.method).toBe('GET');
      req.flush(mockNotif);
    });
  });

  describe('markAsRead', () => {
    it('should send a PUT request to mark as read', () => {
      service.markAsRead('notif-1').subscribe((response) => {
        expect(response).toEqual({ success: true });
      });

      const req = httpMock.expectOne('/api/notifications/notif-1/read');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush({ success: true });
    });
  });

  describe('markAllAsRead', () => {
    it('should send a PUT request to mark all as read', () => {
      service.markAllAsRead().subscribe((response) => {
        expect(response).toEqual({ success: true });
      });

      const req = httpMock.expectOne('/api/notifications/mark-all-read');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({});
      req.flush({ success: true });
    });
  });

  describe('deleteNotification', () => {
    it('should send a DELETE request', () => {
      service.deleteNotification('notif-1').subscribe((response) => {
        expect(response).toEqual({ success: true });
      });

      const req = httpMock.expectOne('/api/notifications/notif-1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });
});
