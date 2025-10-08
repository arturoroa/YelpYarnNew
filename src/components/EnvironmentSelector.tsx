import React, { useEffect, useState } from 'react';
import {
  Globe,
  Server,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Environment } from '../types/api';

interface EnvironmentSelectorProps {
  selectedEnvironment: Environment | null;
  onEnvironmentChange: (environment: Environment) => void;
}

type EnvType = 'production' | 'test';

const emptyEndpoints = () => ({
  yelpBaseUrl: '',
  yelpMobileUrl: '',
  yelpAppUrl: '',
  apiBaseUrl: '',
  searchApiUrl: '',
  gqlEndpoint: '',
  adEventLogUrl: '',
});

const emptyCredentials = () => ({
  apiKey: '',
  clientId: '',
  clientSecret: '',
});

export default function EnvironmentSelector({
  selectedEnvironment,
  onEnvironmentChange,
}: EnvironmentSelectorProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [formData, setFormData] = useState<Partial<Environment>>({
    name: '',
    type: 'test',
    description: '',
    endpoints: emptyEndpoints(),
    credentials: emptyCredentials(),
    integrations: {},
    isActive: false,
  });
  const [showCredentials, setShowCredentials] = useState<{
    apiKey?: boolean;
    clientSecret?: boolean;
  }>({});
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const [availableIntegrations, setAvailableIntegrations] = useState<Array<{ id: string; name: string; type: string; status: string }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    loadEnvironments();
    fetchIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      if (response.ok) {
        const data = await response.json();
        setAvailableIntegrations(data);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    }
  };

  const loadEnvironments = () => {
    // Mock data (replace with API)
    const mockEnvironments: Environment[] = [
      {
        id: 'prod',
        name: 'Production',
        type: 'production',
        description: 'Live Yelp production environment',
        endpoints: {
          yelpBaseUrl: 'https://www.yelp.com',
          yelpMobileUrl: 'https://m.yelp.com',
          yelpAppUrl: 'yelp://',
          apiBaseUrl: 'https://api.yelp.com/v3',
          searchApiUrl: 'https://api.yelp.com/v3/businesses/search',
          gqlEndpoint: 'https://www.yelp.com/gql',
          adEventLogUrl: 'https://analytics.yelp.com/unified_ad_event_log',
        },
        credentials: {
          apiKey: 'prod_api_key_***',
          clientId: 'prod_client_id',
          clientSecret: 'prod_secret_***',
        },
        isActive: true,
      },
      {
        id: 'test',
        name: 'Test Environment',
        type: 'test',
        description: 'Yelp testing and staging environment',
        endpoints: {
          yelpBaseUrl: 'https://test.yelp.com',
          yelpMobileUrl: 'https://m-test.yelp.com',
          yelpAppUrl: 'yelp-test://',
          apiBaseUrl: 'https://api-test.yelp.com/v3',
          searchApiUrl: 'https://api-test.yelp.com/v3/businesses/search',
          gqlEndpoint: 'https://test.yelp.com/gql',
          adEventLogUrl: 'https://analytics-test.yelp.com/unified_ad_event_log',
        },
        credentials: {
          apiKey: 'test_api_key_***',
          clientId: 'test_client_id',
          clientSecret: 'test_secret_***',
        },
        isActive: false,
      },
    ];

    setEnvironments(mockEnvironments);

    // Set default selected environment if none selected yet
    if (!selectedEnvironment && mockEnvironments.length > 0) {
      const activeEnv = mockEnvironments.find((env) => env.isActive) || mockEnvironments[0];
      onEnvironmentChange(activeEnv);
    }
  };

  const handleAddEnvironment = () => {
    setEditingEnvironment(null);
    setFormData({
      name: '',
      type: 'test',
      description: '',
      endpoints: emptyEndpoints(),
      credentials: emptyCredentials(),
      isActive: false,
    });
    setShowModal(true);
  };

  const handleEditEnvironment = (environment: Environment) => {
    // Clone to avoid mutating the list while editing
    setEditingEnvironment(environment);
    setFormData({
      ...environment,
      endpoints: { ...environment.endpoints },
      credentials: environment.credentials ? { ...environment.credentials } : undefined,
    });
    setShowModal(true);
  };

  const handleSaveEnvironment = () => {
    if (!formData.name || !formData.endpoints?.yelpBaseUrl) {
      showToast('Please fill the required fields: Name and Yelp Base URL', 'error');
      return;
    }

    const envToSave: Environment = {
      id: editingEnvironment?.id || `env_${Date.now()}`,
      name: formData.name!.trim(),
      type: (formData.type as EnvType) || 'test',
      description: (formData.description || '').trim(),
      endpoints: {
        ...emptyEndpoints(),
        ...formData.endpoints!,
      },
      credentials: formData.credentials
        ? {
            ...emptyCredentials(),
            ...formData.credentials,
          }
        : undefined,
      isActive: Boolean(formData.isActive),
    };

    setEnvironments((prev) => {
      const next = editingEnvironment
        ? prev.map((e) => (e.id === editingEnvironment.id ? envToSave : e))
        : [...prev, envToSave];

      // If this save sets env active, flip others off
      if (envToSave.isActive) {
        for (const e of next) e.isActive = e.id === envToSave.id;
        onEnvironmentChange(envToSave);
      }
      return next;
    });

    setShowModal(false);
    setEditingEnvironment(null);
    setFormData({
      name: '',
      type: 'test',
      description: '',
      endpoints: emptyEndpoints(),
      credentials: emptyCredentials(),
      integrations: {},
      isActive: false,
    });
  };

  const handleDeleteEnvironment = (id: string, envName: string) => {
    // Show confirmation via state instead of confirm dialog
    if (!window.confirm(`Delete environment "${envName}"?`)) return;

    setEnvironments((prev) => {
      const remaining = prev.filter((env) => env.id !== id);

      // If we deleted the currently selected env, pick a sensible replacement
      if (selectedEnvironment?.id === id) {
        const nextActive = remaining.find((e) => e.isActive) || remaining[0];
        if (nextActive) onEnvironmentChange(nextActive);
        else onEnvironmentChange({} as Environment); // none left; caller should handle nullables
      }

      return remaining;
    });

    showToast(`Environment "${envName}" deleted successfully`, 'success');
  };

  const handleSetActive = (environment: Environment) => {
    setEnvironments((prev) =>
      prev.map((env) => ({
        ...env,
        isActive: env.id === environment.id,
      })),
    );
    onEnvironmentChange(environment);
  };

  const toggleCredentialVisibility = (field: 'apiKey' | 'clientSecret') => {
    setShowCredentials((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const getEnvironmentIcon = (type: EnvType) =>
    type === 'production' ? (
      <Server className="w-5 h-5 text-red-500" />
    ) : (
      <Globe className="w-5 h-5 text-blue-500" />
    );

  const getEnvironmentBadge = (type: EnvType) =>
    type === 'production' ? (
      <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
        Production
      </span>
    ) : (
      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
        Test
      </span>
    );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Environment Configuration</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage API endpoints for different environments
            </p>
          </div>
          <button
            onClick={handleAddEnvironment}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Add Environment"
          >
            <Plus className="w-4 h-4" />
            <span>Add Environment</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Current Environment Display */}
        {selectedEnvironment && selectedEnvironment.endpoints && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                {getEnvironmentIcon(selectedEnvironment.type as EnvType)}
                <div>
                  <h4 className="font-medium text-gray-900">{selectedEnvironment.name}</h4>
                  <p className="text-sm text-gray-600">{selectedEnvironment.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getEnvironmentBadge(selectedEnvironment.type as EnvType)}
                <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Active
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <strong>Base URL:</strong> {selectedEnvironment.endpoints.yelpBaseUrl}
            </div>
          </div>
        )}

        {/* Environment List */}
        <div className="space-y-4">
          {environments.map((environment) => (
            <div key={environment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getEnvironmentIcon(environment.type as EnvType)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">{environment.name}</h4>
                      {getEnvironmentBadge(environment.type as EnvType)}
                      {environment.isActive && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{environment.description}</p>
                    <div className="text-xs text-gray-500">
                      <div>
                        <strong>Base URL:</strong> {environment.endpoints?.yelpBaseUrl || '—'}
                      </div>
                      <div>
                        <strong>API URL:</strong> {environment.endpoints?.apiBaseUrl || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!environment.isActive && (
                    <button
                      onClick={() => handleSetActive(environment)}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Set as Active"
                      aria-label="Set as Active"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditEnvironment(environment)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit Environment"
                    aria-label="Edit Environment"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEnvironment(environment.id, environment.name)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Environment"
                    aria-label="Delete Environment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Environment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEnvironment ? 'Edit Environment' : 'Add New Environment'}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Environment Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Production, Staging, Test, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Environment Type
                  </label>
                  <select
                    value={(formData.type as EnvType) || 'test'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value as EnvType,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="test">Test Environment</option>
                    <option value="production">Production Environment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description of this environment"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* API Endpoints */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">API Endpoints</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/** Yelp Base URL (required) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yelp Base URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={formData.endpoints?.yelpBaseUrl || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endpoints: {
                            ...(prev.endpoints || emptyEndpoints()),
                            yelpBaseUrl: e.target.value,
                          },
                        }))
                      }
                      placeholder="https://www.yelp.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Remaining endpoints */}
                  {[
                    ['yelpMobileUrl', 'Mobile Yelp URL', 'https://m.yelp.com'],
                    ['apiBaseUrl', 'API Base URL', 'https://api.yelp.com/v3'],
                    ['searchApiUrl', 'Search API URL', 'https://api.yelp.com/v3/businesses/search'],
                    ['gqlEndpoint', 'GQL Endpoint', 'https://www.yelp.com/gql'],
                    ['adEventLogUrl', 'Ad Event Log URL', 'https://analytics.yelp.com/unified_ad_event_log'],
                  ].map(([key, label, placeholder]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                      <input
                        type="url"
                        value={(formData.endpoints as any)?.[key] || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            endpoints: {
                              ...(prev.endpoints || emptyEndpoints()),
                              [key]: e.target.value,
                            } as Environment['endpoints'],
                          }))
                        }
                        placeholder={placeholder as string}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Credentials */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">API Credentials</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showCredentials.apiKey ? 'text' : 'password'}
                        value={formData.credentials?.apiKey || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            credentials: {
                              ...(prev.credentials || emptyCredentials()),
                              apiKey: e.target.value,
                            },
                          }))
                        }
                        placeholder="Enter API key"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => toggleCredentialVisibility('apiKey')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Toggle API Key visibility"
                      >
                        {showCredentials.apiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={formData.credentials?.clientId || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          credentials: {
                            ...(prev.credentials || emptyCredentials()),
                            clientId: e.target.value,
                          },
                        }))
                      }
                      placeholder="Enter client ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showCredentials.clientSecret ? 'text' : 'password'}
                        value={formData.credentials?.clientSecret || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            credentials: {
                              ...(prev.credentials || emptyCredentials()),
                              clientSecret: e.target.value,
                            },
                          }))
                        }
                        placeholder="Enter client secret"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => toggleCredentialVisibility('clientSecret')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Toggle Client Secret visibility"
                      >
                        {showCredentials.clientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrations */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Integrations</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Select integrations to use with this environment. Maximum one of each type.
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {/* Database Integration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Database Integration
                    </label>
                    <select
                      value={formData.integrations?.database || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          integrations: {
                            ...(prev.integrations || {}),
                            database: e.target.value || undefined,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- None --</option>
                      {availableIntegrations
                        .filter(i => i.type === 'database' && i.status === 'connected')
                        .map(integration => (
                          <option key={integration.id} value={integration.id}>
                            {integration.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* API Integration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Integration
                    </label>
                    <select
                      value={formData.integrations?.api || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          integrations: {
                            ...(prev.integrations || {}),
                            api: e.target.value || undefined,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- None --</option>
                      {availableIntegrations
                        .filter(i => i.type === 'api' && i.status === 'connected')
                        .map(integration => (
                          <option key={integration.id} value={integration.id}>
                            {integration.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Webhook Integration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Webhook Integration
                    </label>
                    <select
                      value={formData.integrations?.webhook || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          integrations: {
                            ...(prev.integrations || {}),
                            webhook: e.target.value || undefined,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- None --</option>
                      {availableIntegrations
                        .filter(i => i.type === 'webhook' && i.status === 'connected')
                        .map(integration => (
                          <option key={integration.id} value={integration.id}>
                            {integration.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isActive)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Set as Active Environment</div>
                    <div className="text-xs text-gray-500">
                      This will be the default environment for new tests
                    </div>
                  </div>
                </label>
              </div>

              {/* Warning for Production */}
              {formData.type === 'production' && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Production Environment Warning</h4>
                      <p className="text-sm text-red-700 mt-1">
                        You are configuring a production environment. Tests run against production will affect real
                        data and may impact live users. Use with extreme caution.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEnvironment(null);
                  setFormData({
                    name: '',
                    type: 'test',
                    description: '',
                    endpoints: emptyEndpoints(),
                    credentials: emptyCredentials(),
                    integrations: {},
                    isActive: false,
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEnvironment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingEnvironment ? 'Update Environment' : 'Add Environment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg shadow-lg text-white animate-fade-in ${
              toast.type === 'success' ? 'bg-green-600' :
              toast.type === 'error' ? 'bg-red-600' :
              'bg-blue-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}