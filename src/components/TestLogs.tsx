import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Download, Filter, Search, Eye, Calendar, User, Target, X } from 'lucide-react';
import { apiGet } from '../lib/http';

interface TestLog {
  id: string;
  session_id: string;
  guv: string;
  timestamp: string;
  scenario: string;
  action: string;
  success: boolean;
  details: string;
  click_recorded?: boolean;
  filter_triggered?: boolean;
  ip_address?: string;
  user_agent?: string;
  environment?: string;
  business_name?: string;
  servlet_name?: string;
  url?: string;
}

interface TestSession {
  id: string;
  guv: string;
  status: string;
  created_at: string;
  completed_at?: string;
  test_scenarios: string;
}

interface UserCreationLog {
  id: string;
  user_id: string;
  username: string;
  email: string | null;
  password: string | null;
  first_name: string | null;
  last_name: string | null;
  zip_code: string | null;
  birth_date: string | null;
  creation_method: string;
  created_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  automation_data: any;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface TestLogsProps {
  selectedUser?: {guv: string, username: string, email: string} | null;
  onClearFilter?: () => void;
}

export default function TestLogs({ selectedUser, onClearFilter }: TestLogsProps) {
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [userCreationLogs, setUserCreationLogs] = useState<UserCreationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUserLogs, setLoadingUserLogs] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');

  useEffect(() => {
    fetchTestLogs();
    fetchTestSessions();
    fetchUserCreationLogs();
  }, []);

  const fetchTestLogs = async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual API call
      const mockLogs: TestLog[] = [
        {
          id: '1',
          session_id: 'session_123',
          guv: 'guv_user_456',
          timestamp: new Date().toISOString(),
          scenario: 'session_filter_1111',
          action: 'initial_sponsored_click',
          success: true,
          details: 'Initial click on sponsored result - should be billable',
          click_recorded: true,
          filter_triggered: false,
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          environment: 'test',
          business_name: 'Acme Allopathic 2 - TEST PAGE - CLOSED',
          servlet_name: 'biz_details',
          url: 'https://test.yelp.com/biz/acme-allopathic-2'
        },
        {
          id: '2',
          session_id: 'session_123',
          guv: 'guv_user_456',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          scenario: 'session_filter_1111',
          action: 'rapid_reclick_5min',
          success: true,
          details: 'Rapid re-click after 5 minutes - should trigger MoreThanOneClickPerYuvPerBizPerHourFilter',
          click_recorded: false,
          filter_triggered: true,
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          environment: 'test',
          business_name: 'Acme Allopathic 2 - TEST PAGE - CLOSED',
          servlet_name: 'biz_details',
          url: 'https://test.yelp.com/biz/acme-allopathic-2'
        },
        {
          id: '3',
          session_id: 'session_789',
          guv: 'guv_user_789',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          scenario: 'fast_click_rate',
          action: 'fast_click_1',
          success: true,
          details: 'Fast click 1 at 10 clicks/sec - should trigger TooFastClickRateFilter',
          click_recorded: false,
          filter_triggered: true,
          ip_address: '10.0.0.50',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          environment: 'production',
          business_name: 'Test Restaurant',
          servlet_name: 'request_a_quote',
          url: 'https://www.yelp.com/biz/test-restaurant'
        }
      ];
      setLogs(mockLogs);
    } catch (error) {
      console.error('Failed to fetch test logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestSessions = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockSessions: TestSession[] = [
        {
          id: 'session_123',
          guv: 'guv_user_456',
          status: 'completed',
          created_at: new Date().toISOString(),
          completed_at: new Date(Date.now() + 600000).toISOString(),
          test_scenarios: 'session_filter_1111'
        },
        {
          id: 'session_789',
          guv: 'guv_user_789',
          status: 'completed',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 3000000).toISOString(),
          test_scenarios: 'fast_click_rate,no_js_clicks'
        }
      ];
      setSessions(mockSessions);
    } catch (error) {
      console.error('Failed to fetch test sessions:', error);
    }
  };

  const fetchUserCreationLogs = async () => {
    setLoadingUserLogs(true);
    try {
      const response = await apiGet('/api/user-creation-logs?limit=100');
      setUserCreationLogs(response || []);
    } catch (error) {
      console.error('Failed to fetch user creation logs:', error);
      setUserCreationLogs([]);
    } finally {
      setLoadingUserLogs(false);
    }
  };

  const getActionStatusColor = (log: TestLog) => {
    if (!log.success) return 'bg-red-100 text-red-800 border-red-200';
    if (log.filter_triggered) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (log.click_recorded) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getScenarioColor = (scenario: string) => {
    const colors: Record<string, string> = {
      'session_filter_1111': 'bg-purple-100 text-purple-800',
      'fast_click_rate': 'bg-red-100 text-red-800',
      'no_js_clicks': 'bg-orange-100 text-orange-800',
      'excessive_business_views': 'bg-yellow-100 text-yellow-800',
      'mobile_app_clicks': 'bg-blue-100 text-blue-800',
      'high_volume_search': 'bg-indigo-100 text-indigo-800'
    };
    return colors[scenario] || 'bg-gray-100 text-gray-800';
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' ||
      (filter === 'success' && log.success) ||
      (filter === 'failed' && !log.success) ||
      (filter === 'filtered' && log.filter_triggered) ||
      (filter === 'billable' && log.click_recorded);

    const matchesSearch = searchTerm === '' ||
      log.scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.business_name && log.business_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSession = selectedSession === 'all' || log.session_id === selectedSession;

    const matchesUser = !selectedUser || log.guv === selectedUser.guv;

    return matchesFilter && matchesSearch && matchesSession && matchesUser;
  });

  const logCounts = logs.reduce((acc, log) => {
    acc.total = (acc.total || 0) + 1;
    if (log.success) acc.success = (acc.success || 0) + 1;
    else acc.failed = (acc.failed || 0) + 1;
    if (log.filter_triggered) acc.filtered = (acc.filtered || 0) + 1;
    if (log.click_recorded) acc.billable = (acc.billable || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const exportReport = (format: 'json' | 'csv') => {
    const dataToExport = filteredLogs;
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      const jsonData = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-logs-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = [
        'Session ID', 'GUV', 'Timestamp', 'Scenario', 'Action', 'Success', 
        'Details', 'Click Recorded', 'Filter Triggered', 'IP Address', 
        'Environment', 'Business Name', 'Servlet', 'URL'
      ];
      
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(log => [
          log.session_id,
          log.guv,
          log.timestamp,
          log.scenario,
          log.action,
          log.success,
          `"${log.details.replace(/"/g, '""')}"`,
          log.click_recorded || false,
          log.filter_triggered || false,
          log.ip_address || '',
          log.environment || '',
          log.business_name || '',
          log.servlet_name || '',
          log.url || ''
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-logs-${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Test Logs</h2>
          <p className="text-gray-600 mt-1">Monitor detailed test execution logs and click validation results</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchTestLogs}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* User Filter Banner */}
      {selectedUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Viewing logs for user:</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Username:</span> {selectedUser.username}
                </span>
                {selectedUser.email && (
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">Email:</span> {selectedUser.email}
                  </span>
                )}
                <span className="text-sm text-gray-700">
                  <span className="font-medium">GUV:</span> {selectedUser.guv}
                </span>
              </div>
            </div>
          </div>
          {onClearFilter && (
            <button
              onClick={onClearFilter}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Actions</p>
              <p className="text-xl font-bold text-gray-900">{logCounts.total || 0}</p>
            </div>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Successful</p>
              <p className="text-xl font-bold text-green-600">{logCounts.success || 0}</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Failed</p>
              <p className="text-xl font-bold text-red-600">{logCounts.failed || 0}</p>
            </div>
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Filtered</p>
              <p className="text-xl font-bold text-yellow-600">{logCounts.filtered || 0}</p>
            </div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Billable</p>
              <p className="text-xl font-bold text-blue-600">{logCounts.billable || 0}</p>
            </div>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="success">Successful</option>
              <option value="failed">Failed</option>
              <option value="filtered">Filtered</option>
              <option value="billable">Billable</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Session:</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Sessions</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.id.split('_').pop()} ({session.guv.slice(0, 8)}...)
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-gray-500" />
            <button
              onClick={() => exportReport('json')}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => exportReport('csv')}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Test Logs Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Test Execution Logs ({filteredLogs.length})
            </h3>
            {filteredLogs.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportReport('json')}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Full Report</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No test logs found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getActionStatusColor(log)}`}>
                        {log.success ? (log.filter_triggered ? 'FILTERED' : log.click_recorded ? 'BILLABLE' : 'SUCCESS') : 'FAILED'}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getScenarioColor(log.scenario)}`}>
                            {log.scenario}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{log.details}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                        <div>
                          <span className="font-medium">Session:</span> {log.session_id.split('_').pop()}
                        </div>
                        <div>
                          <span className="font-medium">GUV:</span> {log.guv.slice(0, 12)}...
                        </div>
                        <div>
                          <span className="font-medium">IP:</span> {log.ip_address}
                        </div>
                        <div>
                          <span className="font-medium">Env:</span> {log.environment}
                        </div>
                      </div>
                      
                      {log.business_name && (
                        <div className="mt-2 text-xs text-gray-500">
                          <span className="font-medium">Business:</span> {log.business_name}
                          {log.servlet_name && <span className="ml-2"><span className="font-medium">Servlet:</span> {log.servlet_name}</span>}
                        </div>
                      )}
                      
                      {log.url && (
                        <div className="mt-1 text-xs text-gray-500">
                          <span className="font-medium">URL:</span> 
                          <a href={log.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:text-blue-800 underline">
                            {log.url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Creation Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              User Creation Log ({userCreationLogs.length})
            </h3>
            <button
              onClick={fetchUserCreationLogs}
              disabled={loadingUserLogs}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingUserLogs ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingUserLogs ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : userCreationLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No user creation logs found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Password
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ZIP Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Birth Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userCreationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {log.password || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.first_name || log.last_name
                        ? `${log.first_name || ''} ${log.last_name || ''}`.trim()
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.zip_code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.birth_date || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.creation_method === 'automated'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.creation_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.created_by || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}