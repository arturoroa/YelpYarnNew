import React, { useState, useEffect } from 'react';
import { Play, Square, Users, Code, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Clock, User } from 'lucide-react';
import { apiGet, apiPost } from '../lib/http';

interface GuvUser {
  guv: string;
  username: string;
  email: string;
  yelpUserId?: string;
  status: 'active' | 'inactive' | 'pending';
  sessionCount: number;
  lastUsed?: string;
  createdAt: string;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'basic' | 'advanced';
  expectedBehavior: string;
  filterName?: string;
  estimatedDuration: number;
}

interface TestResult {
  id: string;
  sessionId: string;
  scenario: string;
  action: string;
  success: boolean;
  details: string;
  timestamp: string;
  clickRecorded?: boolean;
  filterTriggered?: boolean;
}

interface TestSession {
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  selectedTests: string[];
  results: TestResult[];
  guv: string;
}

const TEST_SCENARIOS: TestScenario[] = [
  // Core Tests
  {
    id: 'session_filter_1111',
    name: 'Session Filter 1:1:1:1 Rule',
    description: 'Tests rapid re-click filtering with timing rules',
    category: 'core',
    expectedBehavior: 'Initial click billable, rapid re-click within 5min filtered, 1hr+ delay billable',
    filterName: 'MoreThanOneClickPerYuvPerBizPerHourFilter',
    estimatedDuration: 8
  },
  // Basic Tests
  {
    id: 'fast_click_rate',
    name: 'Fast Click Rate Test',
    description: 'Detects >7 clicks per second automated behavior',
    category: 'basic',
    expectedBehavior: 'Clicks faster than 7/second should be filtered',
    filterName: 'FastClickRateFilter',
    estimatedDuration: 3
  },
  {
    id: 'no_js_clicks',
    name: 'No-JS Clicks Test',
    description: 'Detects JavaScript-disabled headless browsers',
    category: 'basic',
    expectedBehavior: 'Clicks without JS execution should be filtered',
    filterName: 'NoJSClicksFilter',
    estimatedDuration: 4
  },
  {
    id: 'excessive_business_views',
    name: 'Excessive Business Views',
    description: 'Detects 25+ rapid page views of same business',
    category: 'basic',
    expectedBehavior: 'More than 25 views in short time should be filtered',
    filterName: 'ExcessiveBusinessViewsFilter',
    estimatedDuration: 6
  },
  {
    id: 'invalid_android_version',
    name: 'Invalid Android Version',
    description: 'Filters future or negative Android versions',
    category: 'basic',
    expectedBehavior: 'Invalid Android versions should be filtered',
    filterName: 'InvalidAndroidVersionFilter',
    estimatedDuration: 2
  },
  {
    id: 'internal_ip_spoofing',
    name: 'Internal IP Spoofing',
    description: 'Detects internal Yelp IP range spoofing',
    category: 'basic',
    expectedBehavior: 'Internal IP ranges should be filtered',
    filterName: 'InternalIPSpoofingFilter',
    estimatedDuration: 3
  },
  {
    id: 'mobile_app_clicks',
    name: 'Mobile App Clicks',
    description: 'Tests legitimate mobile app interactions',
    category: 'basic',
    expectedBehavior: 'Valid mobile app clicks should be billable',
    filterName: 'MobileAppClicksFilter',
    estimatedDuration: 5
  },
  {
    id: 'high_volume_search',
    name: 'High Volume Search',
    description: 'Tests 50+ rapid searches with GQL calls',
    category: 'basic',
    expectedBehavior: 'Excessive search volume should be filtered',
    filterName: 'HighVolumeSearchFilter',
    estimatedDuration: 7
  },
  // Advanced Tests
  {
    id: 'session_pollution',
    name: 'Session Pollution',
    description: 'Tests mixed valid/invalid behavior contamination',
    category: 'advanced',
    expectedBehavior: 'Invalid behavior should contaminate entire session',
    filterName: 'SessionPollutionFilter',
    estimatedDuration: 10
  },
  {
    id: 'click_storms',
    name: 'Click Storms',
    description: 'Tests burst views with dwell time analysis',
    category: 'advanced',
    expectedBehavior: 'Burst clicks with low dwell time should be filtered',
    filterName: 'ClickStormsFilter',
    estimatedDuration: 8
  },
  {
    id: 'geo_located_proxies',
    name: 'Geo-Located Proxies',
    description: 'Tests excluded countries filtering',
    category: 'advanced',
    expectedBehavior: 'Clicks from excluded countries should be filtered',
    filterName: 'GeoLocatedProxiesFilter',
    estimatedDuration: 5
  },
  {
    id: 'ui_only_interaction',
    name: 'UI-Only Interaction',
    description: 'Tests screen readers and synthetic events',
    category: 'advanced',
    expectedBehavior: 'Synthetic UI events should be filtered',
    filterName: 'UIOnlyInteractionFilter',
    estimatedDuration: 6
  },
  {
    id: 'latency_manipulation',
    name: 'Latency Manipulation',
    description: 'Tests poor connection simulation',
    category: 'advanced',
    expectedBehavior: 'Artificially slow connections should be filtered',
    filterName: 'LatencyManipulationFilter',
    estimatedDuration: 4
  }
];

export default function TestRunner() {
  const [selectedUser, setSelectedUser] = useState<GuvUser | null>(null);
  const [users, setUsers] = useState<GuvUser[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [customPuppeteerCode, setCustomPuppeteerCode] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [loading, setLoading] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [userCreationStatus, setUserCreationStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({
    loading: false,
    error: null,
    success: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiGet<GuvUser[]>('/api/users/list');
      setUsers(response);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      setUserCreationStatus({
        loading: false,
        error: 'All fields are required',
        success: false
      });
      return;
    }

    setUserCreationStatus({ loading: true, error: null, success: false });

    try {
      // Check if username exists
      const existingUser = await apiGet<GuvUser>(`/api/users/check/${newUser.username}`);
      if (existingUser) {
        setUserCreationStatus({
          loading: false,
          error: 'Username already exists',
          success: false
        });
        return;
      }

      // Create user
      const createdUser = await apiPost<GuvUser>('/api/users/create', newUser);
      
      setUsers(prev => [...prev, createdUser]);
      setSelectedUser(createdUser);
      setUserCreationStatus({ loading: false, error: null, success: true });
      setShowUserModal(false);
      setNewUser({ username: '', email: '', password: '' });
    } catch (error) {
      setUserCreationStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
        success: false
      });
    }
  };

  const selectUser = (user: GuvUser) => {
    setSelectedUser(user);
    setShowUserList(false);
  };

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const selectAllTests = () => {
    setSelectedTests(TEST_SCENARIOS.map(test => test.id));
  };

  const clearAllTests = () => {
    setSelectedTests([]);
  };

  const startTests = async () => {
    if (!selectedUser) {
      alert('Please select a user first');
      return;
    }

    if (selectedTests.length === 0) {
      alert('Please select at least one test');
      return;
    }

    setLoading(true);
    
    try {
      const sessionData = {
        guv: selectedUser.guv,
        selectedTests,
        customPuppeteerCode: customPuppeteerCode.trim() || undefined
      };

      const session = await apiPost<TestSession>('/api/tests/start', sessionData);
      setCurrentSession(session);
      
      // Poll for results
      pollTestResults(session.sessionId);
    } catch (error) {
      console.error('Failed to start tests:', error);
      alert('Failed to start tests');
      setLoading(false);
    }
  };

  const stopTests = async () => {
    if (!currentSession) return;

    try {
      await apiPost(`/api/tests/stop/${currentSession.sessionId}`);
      setCurrentSession(null);
      setLoading(false);
    } catch (error) {
      console.error('Failed to stop tests:', error);
    }
  };

  const pollTestResults = async (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const session = await apiGet<TestSession>(`/api/tests/session/${sessionId}`);
        setCurrentSession(session);
        setTestResults(session.results);

        if (session.status === 'completed' || session.status === 'failed') {
          clearInterval(pollInterval);
          setLoading(false);
          
          // Update user session count
          if (selectedUser) {
            await apiPost(`/api/users/${selectedUser.guv}/increment-session`);
            loadUsers(); // Refresh user list
          }
        }
      } catch (error) {
        console.error('Failed to poll test results:', error);
        clearInterval(pollInterval);
        setLoading(false);
      }
    }, 2000);
  };

  const getTestsByCategory = (category: 'core' | 'basic' | 'advanced') => {
    return TEST_SCENARIOS.filter(test => test.category === category);
  };

  const getTotalEstimatedDuration = () => {
    return selectedTests.reduce((total, testId) => {
      const test = TEST_SCENARIOS.find(t => t.id === testId);
      return total + (test?.estimatedDuration || 0);
    }, 0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'inactive': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'basic': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'advanced': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">YAR Test Runner</h1>
        <p className="text-gray-600">Execute automated tests to validate Yelp Ad Revenue filtering rules</p>
      </div>

      {/* User Management Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Management
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showUserList ? 'Hide Users' : 'Select User'}
            </button>
            <button
              onClick={() => setShowUserModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create User
            </button>
          </div>
        </div>

        {/* Current User Display */}
        {selectedUser && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-500 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">{selectedUser.username}</h3>
                  <p className="text-sm text-gray-600">GUV: {selectedUser.guv}</p>
                  <p className="text-sm text-gray-600">Sessions: {selectedUser.sessionCount}</p>
                </div>
              </div>
              <div className="flex items-center">
                {getStatusIcon(selectedUser.status)}
                <span className="ml-2 text-sm font-medium capitalize">{selectedUser.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* User List */}
        {showUserList && (
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {users.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No users found. Create a user to get started.
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.guv}
                  onClick={() => selectUser(user)}
                  className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{user.username}</h4>
                    <p className="text-sm text-gray-600">GUV: {user.guv}</p>
                    <p className="text-sm text-gray-600">Sessions: {user.sessionCount}</p>
                  </div>
                  <div className="flex items-center">
                    {getStatusIcon(user.status)}
                    <span className="ml-2 text-sm capitalize">{user.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Test Selection Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Test Scenarios</h2>
          <div className="flex gap-2">
            <button
              onClick={selectAllTests}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={clearAllTests}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {selectedTests.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{selectedTests.length}</strong> tests selected • 
              Estimated duration: <strong>{getTotalEstimatedDuration()} minutes</strong>
            </p>
          </div>
        )}

        {/* Core Tests */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Core Tests</h3>
          <div className="grid gap-3">
            {getTestsByCategory('core').map((test) => (
              <div
                key={test.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTests.includes(test.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleTestSelection(test.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTestSelection(test.id)}
                        className="mr-3"
                      />
                      <h4 className="font-medium text-gray-900">{test.name}</h4>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(test.category)}`}>
                        {test.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                    <p className="text-xs text-gray-500 mb-1">
                      <strong>Expected:</strong> {test.expectedBehavior}
                    </p>
                    {test.filterName && (
                      <p className="text-xs text-gray-500">
                        <strong>Filter:</strong> {test.filterName}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {test.estimatedDuration}min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Basic Tests */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Tests</h3>
          <div className="grid gap-3">
            {getTestsByCategory('basic').map((test) => (
              <div
                key={test.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTests.includes(test.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleTestSelection(test.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTestSelection(test.id)}
                        className="mr-3"
                      />
                      <h4 className="font-medium text-gray-900">{test.name}</h4>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(test.category)}`}>
                        {test.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                    <p className="text-xs text-gray-500 mb-1">
                      <strong>Expected:</strong> {test.expectedBehavior}
                    </p>
                    {test.filterName && (
                      <p className="text-xs text-gray-500">
                        <strong>Filter:</strong> {test.filterName}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {test.estimatedDuration}min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Tests */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Tests</h3>
          <div className="grid gap-3">
            {getTestsByCategory('advanced').map((test) => (
              <div
                key={test.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTests.includes(test.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleTestSelection(test.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleTestSelection(test.id)}
                        className="mr-3"
                      />
                      <h4 className="font-medium text-gray-900">{test.name}</h4>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(test.category)}`}>
                        {test.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                    <p className="text-xs text-gray-500 mb-1">
                      <strong>Expected:</strong> {test.expectedBehavior}
                    </p>
                    {test.filterName && (
                      <p className="text-xs text-gray-500">
                        <strong>Filter:</strong> {test.filterName}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {test.estimatedDuration}min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Puppeteer Code Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Code className="w-5 h-5 mr-2" />
            Custom Puppeteer Code
            {customPuppeteerCode.trim() && (
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                {customPuppeteerCode.trim().split('\n').length} lines
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            {showCodeEditor ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {showCodeEditor ? 'Hide' : 'Show'} Editor
          </button>
        </div>

        {showCodeEditor && (
          <div>
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Available Variables:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li><code className="bg-yellow-100 px-1 rounded">page</code> - Puppeteer page instance</li>
                <li><code className="bg-yellow-100 px-1 rounded">config</code> - Test configuration object</li>
                <li><code className="bg-yellow-100 px-1 rounded">sessionId</code> - Current test session ID</li>
                <li><code className="bg-yellow-100 px-1 rounded">guv</code> - Global User Value</li>
                <li><code className="bg-yellow-100 px-1 rounded">console</code> - Custom logging methods (log, error, warn)</li>
              </ul>
            </div>

            <textarea
              value={customPuppeteerCode}
              onChange={(e) => setCustomPuppeteerCode(e.target.value)}
              placeholder={`// Custom Puppeteer code will be executed after each test scenario
// Example:
await page.waitForTimeout(1000);
console.log('Custom code executed for session:', sessionId);

// Navigate to a specific page
await page.goto('https://www.yelp.com/biz/some-business');

// Click elements
await page.click('.some-button');

// Extract data
const title = await page.title();
console.log('Page title:', title);

// Wait for elements
await page.waitForSelector('.search-results');

// Take screenshot
await page.screenshot({ path: '/tmp/custom-screenshot.png' });`}
              className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Test Execution Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Test Execution</h2>
          <div className="flex gap-2">
            {loading ? (
              <button
                onClick={stopTests}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Tests
              </button>
            ) : (
              <button
                onClick={startTests}
                disabled={!selectedUser || selectedTests.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Tests
              </button>
            )}
          </div>
        </div>

        {currentSession && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-blue-900">Session: {currentSession.sessionId}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                currentSession.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                currentSession.status === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {currentSession.status}
              </span>
            </div>
            <p className="text-sm text-blue-700">
              Started: {new Date(currentSession.startTime).toLocaleString()}
            </p>
            {currentSession.endTime && (
              <p className="text-sm text-blue-700">
                Completed: {new Date(currentSession.endTime).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Running tests...</p>
          </div>
        )}
      </div>

      {/* Test Results Section */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
          <div className="space-y-3">
            {testResults.map((result) => (
              <div
                key={result.id}
                className={`p-4 rounded-lg border ${
                  result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      )}
                      <h4 className="font-medium text-gray-900">{result.scenario}</h4>
                      <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {result.action}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{result.details}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Time: {new Date(result.timestamp).toLocaleString()}</span>
                      {result.clickRecorded !== undefined && (
                        <span>Click Recorded: {result.clickRecorded ? 'Yes' : 'No'}</span>
                      )}
                      {result.filterTriggered !== undefined && (
                        <span>Filter Triggered: {result.filterTriggered ? 'Yes' : 'No'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Creation Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                />
              </div>

              {userCreationStatus.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{userCreationStatus.error}</p>
                </div>
              )}

              {userCreationStatus.success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">User created successfully!</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={createUser}
                disabled={userCreationStatus.loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {userCreationStatus.loading ? 'Creating...' : 'Create User'}
              </button>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setUserCreationStatus({ loading: false, error: null, success: false });
                  setNewUser({ username: '', email: '', password: '' });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}