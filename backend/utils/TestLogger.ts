import winston from 'winston';
import fs from 'fs';
import path from 'path';

export interface TestLogEntry {
  sessionId: string;
  guv: string;
  timestamp: string;
  screenName: string;
  action: string;
  duration?: number;
  clickTimestamp?: string;
  ipAddress: string;
  userAgent: string;
  environment: 'production' | 'test';
  businessName?: string;
  filterTriggered?: boolean;
  billableClick?: boolean;
  billableClickReason?: string;
  servletName?: string;
  url?: string;
  metadata?: any;
}

export interface UnifiedAdEventMapping {
  sessionId: string;
  guv: string;
  businessId: string;
  clickId: string;
  timestamp: string;
  billable_click: boolean;
  billable_click_reason: string;
  servlet_name: string;
  ip_address: string;
  user_agent: string;
  filter_name?: string;
  test_scenario: string;
}

export class TestLogger {
  private static instance: TestLogger;

  private constructor() {}

  static getInstance(): TestLogger {
    if (!TestLogger.instance) {
      TestLogger.instance = new TestLogger();
    }
    return TestLogger.instance;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }

  logClickEvent(sessionId: string, guv: string, data: any): void {
    console.log('[CLICK EVENT]', { sessionId, guv, data });
  }

  logTestAction(data: any): void {
    console.log('[TEST ACTION]', data);
  }

  logScreenTransition(sessionId: string, guv: string, data: any): void {
    console.log('[SCREEN TRANSITION]', { sessionId, guv, data });
  }
}

export default TestLogger;





