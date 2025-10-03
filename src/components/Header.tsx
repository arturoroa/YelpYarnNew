import React, { useState } from 'react';
import { Home, Play, Database, Eye, FileText, Settings, Target, Globe } from 'lucide-react';

export type ActiveView = 'dashboard' | 'test-runner' | 'session-viewer' | 'test-logs' | 'system-logs' | 'integrations' | 'environment-settings';

interface HeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

export function Header({ activeView, onViewChange }: HeaderProps) {
  const [showDocumentation, setShowDocumentation] = useState(false);

  const navigationItems = [
    { id: 'dashboard' as ActiveView, label: 'Dashboard', icon: Home },
    { id: 'test-runner' as ActiveView, label: 'Test Runner', icon: Play },
    { id: 'session-viewer' as ActiveView, label: 'Session Viewer', icon: Eye },
    { id: 'test-logs' as ActiveView, label: 'Test Logs', icon: Target },
    { id: 'system-logs' as ActiveView, label: 'System Logs', icon: FileText },
    { id: 'integrations' as ActiveView, label: 'Integrations', icon: Database },
    { id: 'environment-settings' as ActiveView, label: 'Environment Settings', icon: Target },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Globe className="h-8 w-8 text-blue-600" />
            <h1 className="ml-3 text-xl font-bold text-gray-900">YELP (YAR) Testing Platform</h1>
          </div>

          {/* Navigation */}
          <nav className="flex space-x-8">
            {navigationItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>

          {/* Settings */}
          <div className="flex items-center">
            <div className="relative">
              <button 
                onClick={() => setShowDocumentation(!showDocumentation)}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <Settings className="h-5 w-5" />
              </button>
              
              {showDocumentation && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowDocumentation(false);
                        window.open('#technical-docs', '_blank');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FileText className="w-4 h-4 mr-3" />
                      Technical Documentation
                    </button>
                    <button
                      onClick={() => {
                        setShowDocumentation(false);
                        window.open('#user-guide', '_blank');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Database className="w-4 h-4 mr-3" />
                      User Guide
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Technical Documentation Modal */}
      {showDocumentation && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDocumentation(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">YELP (YAR) Testing Platform Documentation</h2>
                <button
                  onClick={() => setShowDocumentation(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Documentation content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Technical Documentation */}
                <div className="space-y-6">
                  <div className="flex items-center mb-4">
                    <FileText className="w-6 h-6 text-blue-600 mr-3" />
                    <h3 className="text-xl font-semibold text-gray-900">Technical Documentation</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Architecture Overview</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        The YELP (YAR) Testing Platform is built with React frontend and Node.js backend, 
                        designed to validate Yelp Ad Revenue click filtering rules and ensure SOX compliance.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• Frontend: React 18 + TypeScript + Tailwind CSS</li>
                        <li>• Backend: Node.js + Express + Puppeteer</li>
                        <li>• Database: SQLite with migration support</li>
                        <li>• Testing: Automated browser testing with Puppeteer</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">API Endpoints</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><code className="bg-gray-100 px-2 py-1 rounded">GET /api/tests/sessions</code> - List test sessions</div>
                        <div><code className="bg-gray-100 px-2 py-1 rounded">POST /api/tests/start</code> - Start new test</div>
                        <div><code className="bg-gray-100 px-2 py-1 rounded">GET /api/logs/system/recent</code> - System logs</div>
                        <div><code className="bg-gray-100 px-2 py-1 rounded">POST /api/users/create</code> - Create GUV user</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Test Scenarios</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• <strong>Core:</strong> Session Filter 1:1:1:1 Rule</li>
                        <li>• <strong>Basic:</strong> Fast Click Rate, No-JS Clicks, Excessive Views</li>
                        <li>• <strong>Advanced:</strong> Session Pollution, Click Storms, Geo-Proxies</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Environment Configuration</h4>
                      <p className="text-sm text-gray-600">
                        Configure multiple environments (Production/Test) with custom endpoints:
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• Yelp Base URL, Mobile URL, App URL</li>
                        <li>• API endpoints and GQL endpoints</li>
                        <li>• Ad Event Log URLs</li>
                        <li>• API credentials and authentication</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* User Guide */}
                <div className="space-y-6">
                  <div className="flex items-center mb-4">
                    <Database className="w-6 h-6 text-green-600 mr-3" />
                    <h3 className="text-xl font-semibold text-gray-900">User Guide</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Getting Started</h4>
                      <ol className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>1. Configure your environment in <strong>Environment Settings</strong></li>
                        <li>2. Create or select a GUV user in <strong>Test Runner</strong></li>
                        <li>3. Select test scenarios to execute</li>
                        <li>4. Monitor results in <strong>Dashboard</strong></li>
                      </ol>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Dashboard Features</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• <strong>Session Overview:</strong> View all test sessions and their status</li>
                        <li>• <strong>Statistics:</strong> Total, pending, running, completed, failed sessions</li>
                        <li>• <strong>Environment Indicator:</strong> Shows current active environment</li>
                        <li>• <strong>Quick Actions:</strong> View session details, refresh data</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Test Runner</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• <strong>User Management:</strong> Create/select GUV users</li>
                        <li>• <strong>Test Selection:</strong> Choose from Core, Basic, Advanced tests</li>
                        <li>• <strong>Custom Code:</strong> Add custom Puppeteer scripts</li>
                        <li>• <strong>Execution:</strong> Start/stop tests, monitor progress</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Session Viewer</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• <strong>Detailed Results:</strong> View test results and logs</li>
                        <li>• <strong>Summary Stats:</strong> Actions, clicks, filters triggered</li>
                        <li>• <strong>Timeline:</strong> Chronological test execution flow</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Test Logs</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• <strong>Comprehensive Logging:</strong> All test execution details</li>
                        <li>• <strong>Advanced Filtering:</strong> By status, session, scenario</li>
                        <li>• <strong>Export Reports:</strong> JSON/CSV format with full details</li>
                        <li>• <strong>Search:</strong> Find specific actions or business names</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">System Logs</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• <strong>Application Monitoring:</strong> System-level logs and errors</li>
                        <li>• <strong>Log Levels:</strong> Info, Warning, Error, Debug filtering</li>
                        <li>• <strong>Real-time Updates:</strong> Live log streaming</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Integrations</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• <strong>Database Connections:</strong> Configure test databases</li>
                        <li>• <strong>Proxy Servers:</strong> Set up proxy configurations</li>
                        <li>• <strong>VPN Connections:</strong> Manage VPN settings</li>
                        <li>• <strong>Connection Testing:</strong> Verify integration health</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">SOX Compliance Features</h4>
                  <ul className="text-sm text-blue-800 space-y-1 ml-4">
                    <li>• Comprehensive audit trails for all test activities</li>
                    <li>• Detailed logging of click validation and filtering decisions</li>
                    <li>• Export capabilities for compliance reporting</li>
                    <li>• Environment separation for production safety</li>
                    <li>• User activity tracking and session management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}