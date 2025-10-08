export interface TestSession {
  id: string;
  guv: string;
  ip_address: string;
  user_agent: string;
  test_scenarios: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  results?: string;
}

export interface TestResult {
  id: string;
  session_id: string;
  scenario: string;
  action: string;
  timestamp: string;
  success: boolean;
  details: string;
  filter_triggered?: boolean;
  click_recorded?: boolean;
}

export interface TestLog {
  id: string;
  session_id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  details?: string;
}

export interface TestScenario {
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  expectedBehavior: string;
  testSteps?: string[];
  servlets?: string[];
  platform?: string;
  targetBusiness?: string;
  filterName?: string;
  expectedFilterRate?: string;
}

export interface DeviceProfile {
  name: string;
  userAgent: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

export interface NetworkCondition {
  name: string;
  offline: boolean;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
}

export interface BusinessOption {
  name: string;
  description: string;
  location: string;
  category: string;
}
export interface Environment {
  id: string;
  name: string;
  type: 'production' | 'test';
  description: string;
  endpoints: {
    yelpBaseUrl: string;
    yelpMobileUrl: string;
    yelpAppUrl: string;
    apiBaseUrl: string;
    searchApiUrl: string;
    gqlEndpoint: string;
    adEventLogUrl: string;
  };
  credentials?: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
  integrations?: {
    database?: string;
    api?: string;
    webhook?: string;
  };
  isActive: boolean;
}