import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Download, Filter, Search } from 'lucide-react';
import { apiGet } from '../lib/http';

interface SystemLog {
  id: string;
  user_id: string | null;
  action: string;
  details: any;
  timestamp: string;
  created_at: string;
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSystemLogs();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchSystemLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemLogs = async () => {
    // Save current scroll position
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    setLoading(true);
    try {
      const data = await apiGet<SystemLog[]>('/api/system-logs');
      setLogs(data);

      // Restore scroll position after state update
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPosition;
        }
      }, 0);
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLogDetails = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getActionColor = (action: string, details: any = {}) => {
    if (action.includes('deleted') || action.includes('error')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (action.includes('test')) {
      const testResult = details?.test_result;
      if (testResult === 'success') {
        return 'bg-green-100 text-green-800 border-green-200';
      } else if (testResult === 'failure' || testResult === 'error') {
        return 'bg-red-100 text-red-800 border-red-200';
      }
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (action.includes('updated') || action.includes('migrated')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    if (action.includes('created')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' ||
      (filter === 'created' && log.action.includes('created')) ||
      (filter === 'updated' && log.action.includes('updated')) ||
      (filter === 'deleted' && log.action.includes('deleted')) ||
      (filter === 'test' && log.action.includes('test'));

    const matchesSearch = searchTerm === '' ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const logCounts = logs.reduce((acc, log) => {
    acc.total = (acc.total || 0) + 1;
    if (log.action.includes('created')) acc.created = (acc.created || 0) + 1;
    if (log.action.includes('updated')) acc.updated = (acc.updated || 0) + 1;
    if (log.action.includes('deleted')) acc.deleted = (acc.deleted || 0) + 1;
    if (log.action.includes('test')) acc.test = (acc.test || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">System Logs</h2>
          <p className="text-gray-600 mt-1">Monitor application logs and integration events</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchSystemLogs}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Log Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{logCounts.total || 0}</p>
            </div>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Created</p>
              <p className="text-xl font-bold text-green-600">{logCounts.created || 0}</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Updated</p>
              <p className="text-xl font-bold text-yellow-600">{logCounts.updated || 0}</p>
            </div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Deleted</p>
              <p className="text-xl font-bold text-red-600">{logCounts.deleted || 0}</p>
            </div>
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Tests</p>
              <p className="text-xl font-bold text-purple-600">{logCounts.test || 0}</p>
            </div>
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Filter by action:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
                <option value="test">Tests</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Logs Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Logs ({filteredLogs.length})
            </h3>
            {filteredLogs.length > 0 && (
              <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>

        <div ref={scrollContainerRef} className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No logs found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getActionColor(log.action, log.details)}`}>
                      {log.action.replace(/_/g, ' ').toUpperCase()}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-1">
                          {log.details.integration_name && (
                            <p className="text-xs text-gray-600">
                              Integration: <span className="font-medium">{log.details.integration_name}</span>
                            </p>
                          )}
                          {log.details.integration_type && (
                            <p className="text-xs text-gray-600">
                              Type: <span className="font-medium">{log.details.integration_type}</span>
                            </p>
                          )}
                          {log.details.test_result && (
                            <p className="text-xs text-gray-600">
                              Test Result: <span className={`font-medium ${
                                log.details.test_result === 'success' ? 'text-green-600' :
                                log.details.test_result === 'failure' || log.details.test_result === 'error' ? 'text-red-600' :
                                'text-gray-600'
                              }`}>{log.details.test_result}</span>
                            </p>
                          )}
                          {log.details.test_message && (
                            <p className="text-xs text-gray-600 mt-1">
                              Message: <span className="font-medium">{log.details.test_message}</span>
                            </p>
                          )}
                          <div className="mt-2">
                            <button
                              onClick={() => toggleLogDetails(log.id)}
                              className="text-xs text-blue-600 cursor-pointer hover:text-blue-800 focus:outline-none"
                            >
                              {expandedLogs.has(log.id) ? '▼ Hide details' : '▶ View full details'}
                            </button>
                            {expandedLogs.has(log.id) && (
                              <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded border overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
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
    </div>
  );
}
