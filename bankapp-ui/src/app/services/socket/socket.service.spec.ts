/**
 * Unit Tests for SocketService
 */

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { SocketService, AppNotification } from './socket.service';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../notification/toast.service';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  };
  return {
    io: vi.fn(() => mSocket),
    Socket: vi.fn(),
  };
});

import { io } from 'socket.io-client';

describe('SocketService Unit Tests', () => {
  let service: SocketService;
  let authServiceMock: any;
  let toastServiceMock: any;
  let socketMock: any;

  const mockUser = { _id: 'user-1', name: 'John Doe' };

  beforeEach(() => {
    authServiceMock = {
      currentUser: signal(null),
    };

    toastServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        SocketService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });

    socketMock = (io as any)().connect.mock.results[0]?.value || (io as any)();
    service = TestBed.inject(SocketService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('connect', () => {
    it('should not connect if no user is logged in', () => {
      authServiceMock.currentUser.set(null);
      service.connect();
      expect(socketMock.connect).not.toHaveBeenCalled();
    });

    it('should connect if user is logged in', () => {
      authServiceMock.currentUser.set(mockUser);
      service.connect();
      expect(socketMock.connect).toHaveBeenCalled();
    });
  });

  describe('seedFromApi', () => {
    it('should set notifications and unread count from API data', () => {
      const mockNotifs: AppNotification[] = [
        {
          _id: '1',
          message: 'Test 1',
          type: 'info',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          message: 'Test 2',
          type: 'info',
          isRead: true,
          createdAt: new Date().toISOString(),
        },
      ];

      service.seedFromApi(mockNotifs);

      expect(service.notifications()).toEqual(mockNotifs);
      expect(service.unreadCount()).toBe(1);
    });

    it('should handle empty list', () => {
      service.seedFromApi([]);
      expect(service.notifications()).toEqual([]);
      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('Notification Handling', () => {
    it('should handle incoming notification via handleIncomingNotification (indirectly via listener)', () => {
      // Accessing private method for unit testing internal logic
      const data = { _id: 'new-1', message: 'New message', type: 'info' };

      // Manually trigger the listener callback
      const callback = socketMock.on.mock.calls.find((call: any) => call[0] === 'notification')[1];
      callback(data);

      expect(service.notifications()[0].message).toBe('New message');
      expect(service.unreadCount()).toBe(1);
      expect(toastServiceMock.info).toHaveBeenCalledWith('New message');
    });

    it('should avoid duplicate notifications by ID', () => {
      const data = { _id: 'dup-1', message: 'Duplicate', type: 'info' };
      const callback = socketMock.on.mock.calls.find((call: any) => call[0] === 'notification')[1];

      callback(data);
      callback(data); // Second time with same ID

      expect(service.notifications().length).toBe(1);
      expect(service.unreadCount()).toBe(1);
    });

    it('should show success toast for approved types', () => {
      const data = { _id: 'app-1', message: 'Approved!', type: 'transfer_approved' };
      const callback = socketMock.on.mock.calls.find((call: any) => call[0] === 'notification')[1];

      callback(data);
      expect(toastServiceMock.success).toHaveBeenCalledWith('Approved!');
    });

    it('should show error toast for rejected types', () => {
      const data = { _id: 'rej-1', message: 'Rejected!', type: 'transfer_rejected' };
      const callback = socketMock.on.mock.calls.find((call: any) => call[0] === 'notification')[1];

      callback(data);
      expect(toastServiceMock.error).toHaveBeenCalledWith('Rejected!');
    });
  });

  describe('Authentication', () => {
    it('should emit authenticate event on connect if user exists', () => {
      authServiceMock.currentUser.set(mockUser);
      const connectCallback = socketMock.on.mock.calls.find(
        (call: any) => call[0] === 'connect',
      )[1];

      connectCallback();
      expect(socketMock.emit).toHaveBeenCalledWith('authenticate', 'user-1');
    });
  });

  describe('disconnect', () => {
    it('should disconnect if connected', () => {
      socketMock.connected = true;
      service.disconnect();
      expect(socketMock.disconnect).toHaveBeenCalled();
    });
  });
});
