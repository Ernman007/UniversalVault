/**
 * Integration Tests for ActivityLogService
 * Flow J: Activity Log
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ActivityLogService, ActivityLogEntry } from './activity-log.service';

describe('ActivityLogService Integration - Flow J', () => {
  let service: ActivityLogService;
  let httpMock: HttpTestingController;

  const mockActivities: ActivityLogEntry[] = [
    { _id: 'act-1', userId: 'user-1', action: 'login', timestamp: new Date().toISOString() },
    {
      _id: 'act-2',
      userId: 'user-1',
      action: 'transfer',
      metadata: { amount: 100, to: 'acc-2' },
      timestamp: new Date().toISOString(),
    },
    {
      _id: 'act-3',
      userId: 'user-1',
      action: 'card_freeze',
      metadata: { cardId: 'card-1' },
      timestamp: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ActivityLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getRecentActivities', () => {
    it('should fetch recent activities', () => {
      service.getRecentActivities().subscribe((activities) => {
        expect(activities.length).toBe(3);
        expect(activities[0].action).toBe('login');
        expect(activities[1].action).toBe('transfer');
        expect(activities[2].action).toBe('card_freeze');
      });

      const req = httpMock.expectOne('/api/activity-logs');
      expect(req.request.method).toBe('GET');
      req.flush(mockActivities);
    });

    it('should handle empty activity list', () => {
      service.getRecentActivities().subscribe((activities) => {
        expect(activities.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/activity-logs');
      req.flush([]);
    });

    it('should include metadata when present', () => {
      service.getRecentActivities().subscribe((activities) => {
        expect(activities[1].metadata).toBeDefined();
        expect(activities[1].metadata?.amount).toBe(100);
        expect(activities[1].metadata?.to).toBe('acc-2');
      });

      const req = httpMock.expectOne('/api/activity-logs');
      req.flush(mockActivities);
    });

    it('should handle error gracefully', () => {
      let errorOccurred = false;

      service.getRecentActivities().subscribe({
        next: () => {
          /* should not reach */
        },
        error: (err) => {
          errorOccurred = true;
          expect(err.status).toBe(401);
        },
      });

      const req = httpMock.expectOne('/api/activity-logs');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(errorOccurred).toBe(true);
    });
  });

  describe('Activity Types', () => {
    it('should handle login activities', () => {
      const loginActivity = {
        _id: 'act-1',
        userId: 'user-1',
        action: 'login',
        timestamp: new Date().toISOString(),
      };

      service.getRecentActivities().subscribe((activities) => {
        expect(activities[0].action).toBe('login');
      });

      const req = httpMock.expectOne('/api/activity-logs');
      req.flush([loginActivity]);
    });

    it('should handle transfer activities with metadata', () => {
      const transferActivity: ActivityLogEntry = {
        _id: 'act-1',
        userId: 'user-1',
        action: 'transfer',
        metadata: { amount: 500, from: 'acc-1', to: 'acc-2', reference: 'Payment' },
        timestamp: new Date().toISOString(),
      };

      service.getRecentActivities().subscribe((activities) => {
        expect(activities[0].action).toBe('transfer');
        expect(activities[0].metadata?.amount).toBe(500);
        expect(activities[0].metadata?.reference).toBe('Payment');
      });

      const req = httpMock.expectOne('/api/activity-logs');
      req.flush([transferActivity]);
    });

    it('should handle card activities', () => {
      const cardActivity: ActivityLogEntry = {
        _id: 'act-1',
        userId: 'user-1',
        action: 'card_request',
        metadata: { cardType: 'credit', accountId: 'acc-1' },
        timestamp: new Date().toISOString(),
      };

      service.getRecentActivities().subscribe((activities) => {
        expect(activities[0].action).toBe('card_request');
        expect(activities[0].metadata?.cardType).toBe('credit');
      });

      const req = httpMock.expectOne('/api/activity-logs');
      req.flush([cardActivity]);
    });

    it('should handle loan activities', () => {
      const loanActivity: ActivityLogEntry = {
        _id: 'act-1',
        userId: 'user-1',
        action: 'loan_application',
        metadata: { amount: 10000, term: 24, purpose: 'Home renovation' },
        timestamp: new Date().toISOString(),
      };

      service.getRecentActivities().subscribe((activities) => {
        expect(activities[0].action).toBe('loan_application');
        expect(activities[0].metadata?.amount).toBe(10000);
      });

      const req = httpMock.expectOne('/api/activity-logs');
      req.flush([loanActivity]);
    });
  });
});
