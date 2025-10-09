import React, { useEffect, useState } from 'react';
import { Database, Server, Key, Shield, Plus, Trash2, CircleCheck as CheckCircle, Circle as XCircle, Pencil, Save, X, RefreshCw, AlertTriangle } from 'lucide-react';

type IntegrationType = 'database' | 'proxy' | 'vpn';
type IntegrationStatus = 'connected' | 'disconnected' | 'error';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  lastSync?: string;
  config: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    protocol?: string;
    connectionMethod?: string;
    apiToken?: string;
    country?: string;
    region?: string;
    city?: string;
    ssl?: boolean;
    maxConnections?: number;
    timeout?: number;
  };
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newIntegration, setNewIntegration] = useState<Partial<Integration>>({
    type: 'database',
    config: { connectionMethod: 'sqlite' }
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      if (!response.ok) throw new Error('Failed to fetch integrations');

      const data = await response.json();
      setIntegrations((data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status,
        lastSync: item.last_sync,
        config: item.config || {}
      })));
    } catch (error) {
      console.error('Error fetching integrations:', error);
      showToast('Failed to fetch integrations', 'error');
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Integration> | null>(null);

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const setBusyFor = (id: string, val: boolean) =>
    setBusy(prev => ({ ...prev, [id]: val }));

  const parsePort = (value: string): number | undefined => {
    if (value.trim() === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const getIcon = (type: IntegrationType) => {
    switch (type) {
      case 'database': return <Database className="w-5 h-5" />;
      case 'proxy': return <Shield className="w-5 h-5" />;
      case 'vpn': return <Key className="w-5 h-5" />;
      default: return <Server className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected': return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCardColor = (type: IntegrationType) => {
    switch (type) {
      case 'database': return 'border-green-200 bg-green-50';
      case 'proxy': return 'border-purple-200 bg-purple-50';
      case 'vpn': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatHost = (cfg: Integration['config']) => {
    if (!cfg.host) return null;
    const hasPort = typeof cfg.port === 'number' && Number.isFinite(cfg.port);
    return (
      <div className="flex justify-between">
        <span>Host:</span>
        <span className="font-mono">{cfg.host}{hasPort ? `:${cfg.port}` : ''}</span>
      </div>
    );
  };

  const formatLocation = (cfg: Integration['config']) => {
    const { city, region, country } = cfg;
    if (!city && !region && !country) return null;
    const parts = [city, region, country].filter(Boolean).join(', ');
    return (
      <div className="flex justify-between">
        <span>Location:</span>
        <span>{parts}</span>
      </div>
    );
  };

  const handleAddIntegration = async () => {
    const name = (newIntegration.name || '').trim();
    const type = newIntegration.type as IntegrationType | undefined;
    if (!name || !type) return;

    const cfg = { ...(newIntegration.config || {}) };
    if (typeof cfg.port !== 'number' || !Number.isFinite(cfg.port)) delete cfg.port;

    // Set default protocol for on-prem connections
    if (type === 'database' && cfg.connectionMethod === 'on-prem' && !cfg.protocol) {
      cfg.protocol = 'postgresql';
    }

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          config: cfg,
          status: 'disconnected'
        })
      });

      if (!response.ok) throw new Error('Failed to create integration');

      await fetchIntegrations();
      setNewIntegration({ type: 'database', config: { connectionMethod: 'sqlite' } });
      setShowAddForm(false);
      showToast('Integration created successfully', 'success');
    } catch (error) {
      console.error('Error creating integration:', error);
      showToast('Failed to create integration', 'error');
    }
  };

  const [migrationModal, setMigrationModal] = useState<{ show: boolean; integrationId: string; integrationName: string; inUse: boolean } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleDeleteIntegration = async (id: string) => {
    try {
      console.log('=== INTEGRATION DELETION CHECK ===');
      console.log('Attempting to delete integration ID:', id);

      const integration = integrations.find(i => i.id === id);
      if (!integration) {
        showToast('Integration not found', 'error');
        return;
      }

      console.log('Attempting to delete integration...');

      const response = await fetch(`/api/integrations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          throw new Error('Failed to delete integration');
        }

        if (response.status === 400) {
          if (integration.type === 'database') {
            setMigrationModal({
              show: true,
              integrationId: id,
              integrationName: integration.name,
              inUse: true
            });
            showToast(errorData.error || 'Integration is in use', 'error');
            return;
          }

          showToast(errorData.error || 'Cannot delete integration that is in use', 'error');
          return;
        }

        throw new Error(errorData.error || 'Failed to delete integration');
      }

      await fetchIntegrations();
      showToast('Integration deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting integration:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete integration', 'error');
    }
  };

  const handleMigrateAndDelete = async () => {
    if (!migrationModal) return;

    setIsMigrating(true);
    try {
      // Step 1: Migrate data back to defaultRecorder.db
      console.log(`Migrating data from integration ${migrationModal.integrationId}...`);
      const migrateResponse = await fetch(`/api/integrations/${migrationModal.integrationId}/migrate-to-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!migrateResponse.ok) {
        const error = await migrateResponse.json();
        throw new Error(error.error || 'Failed to migrate data');
      }

      const migrateResult = await migrateResponse.json();
      console.log('Migration successful:', migrateResult);
      showToast(`Data migrated: ${JSON.stringify(migrateResult.migrated)}`, 'success');

      // Step 2: Now delete the integration
      const deleteResponse = await fetch(`/api/integrations/${migrationModal.integrationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        throw new Error(error.error || 'Failed to delete integration');
      }

      await fetchIntegrations();
      showToast('Integration deleted successfully after data migration', 'success');
      setMigrationModal(null);
    } catch (error) {
      console.error('Error migrating and deleting:', error);
      showToast(error instanceof Error ? error.message : 'Failed to migrate and delete integration', 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  const startEdit = (intg: Integration) => {
    setEditingId(intg.id);
    setDraft(JSON.parse(JSON.stringify(intg)));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!editingId || !draft) return;

    const name = (draft.name || '').trim();
    const type = draft.type as IntegrationType | undefined;
    if (!name || !type) return;

    const cfg = { ...(draft.config || {}) };
    if (typeof cfg.port !== 'number' || !Number.isFinite(cfg.port)) delete cfg.port;

    try {
      const response = await fetch(`/api/integrations/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          config: cfg
        })
      });

      if (!response.ok) throw new Error('Failed to update integration');

      await fetchIntegrations();
      cancelEdit();
      showToast('Integration updated successfully', 'success');
    } catch (error) {
      console.error('Error updating integration:', error);
      showToast('Failed to update integration', 'error');
    }
  };

  const testConnection = async (id: string) => {
    console.log('Testing connection for:', id);
    setBusyFor(id, true);
    try {
      const target = integrations.find(i => i.id === id);
      if (!target) {
        console.log('Integration not found:', id);
        return;
      }

      console.log('Testing connection to:', target.type, target.config);

      // Try backend API for real connection testing
      const response = await fetch('/api/integrations/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: target.id,
          name: target.name,
          type: target.type,
          config: target.config
        })
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const result = await response.json();

      // Check if this is a timeout error from backend environment restrictions
      const isBackendTimeout = result.details?.code === 'ETIMEDOUT' || result.error?.includes('timed out');

      if (isBackendTimeout) {
        // Backend environment can't reach external hosts - save config as disconnected
        await fetch(`/api/integrations/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'disconnected',
            last_sync: 'Config saved (not verified)'
          })
        });

        await fetchIntegrations();

        showToast(`Configuration saved for ${target.name}. Connection testing is unavailable in this environment due to network restrictions, but the configuration will be used when running tests.`, 'info');
        return;
      }

      const newStatus: IntegrationStatus = result.success ? 'connected' : 'error';
      const lastSync = result.success ? 'just now' : undefined;

      // Update in database
      await fetch(`/api/integrations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          last_sync: lastSync
        })
      });

      await fetchIntegrations();

      if (result.success) {
        showToast(result.message || 'Connection successful', 'success');
      } else {
        showToast(result.error || 'Connection failed', 'error');
      }
    } catch (error) {
      console.error('Test connection error:', error);
      const errorStatus: IntegrationStatus = 'error';

      try {
        await fetch(`/api/integrations/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: errorStatus })
        });
        await fetchIntegrations();
      } catch (dbError) {
        console.error('Failed to update status:', dbError);
      }
      showToast(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setBusyFor(id, false);
    }
  };

  const isEditing = (id: string) => editingId === id;

  const renderViewFields = (integration: Integration) => (
    <div className="space-y-2 text-sm text-gray-600">
      <div className="flex justify-between">
        <span>Type:</span>
        <span className="capitalize font-medium">{integration.type}</span>
      </div>

      {formatHost(integration.config)}

      {integration.config.database && (
        <div className="flex justify-between">
          <span>Database:</span>
          <span className="font-mono">{integration.config.database}</span>
        </div>
      )}

      {integration.config.username && (
        <div className="flex justify-between">
          <span>Username:</span>
          <span className="font-mono">{integration.config.username}</span>
        </div>
      )}

      {integration.config.protocol && (
        <div className="flex justify-between">
          <span>Protocol:</span>
          <span className="uppercase font-medium">{integration.config.protocol}</span>
        </div>
      )}

      {formatLocation(integration.config)}

      {integration.config.ssl && (
        <div className="flex justify-between">
          <span>SSL:</span>
          <span className="text-green-600 font-medium">Enabled</span>
        </div>
      )}

      {integration.lastSync && (
        <div className="flex justify-between">
          <span>Last Sync:</span>
          <span>{integration.lastSync}</span>
        </div>
      )}
    </div>
  );

  const renderEditFields = (id: string) => {
    if (!draft) return null;
    const cfg = draft.config || {};
    return (
      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-gray-700 mb-1">Name</label>
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={draft.name || ''}
            onChange={(e) => setDraft(prev => ({ ...(prev as any), name: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-1">Type</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={draft.type || 'database'}
            onChange={(e) => setDraft(prev => ({ ...(prev as any), type: e.target.value as IntegrationType }))}
          >
            <option value="database">Database</option>
            <option value="proxy">Proxy Server</option>
            <option value="vpn">VPN Connection</option>
          </select>
        </div>

        {(draft.type === 'database') && (
          <>
            <div>
              <label className="block text-gray-700 mb-1">Connection Method</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={cfg.connectionMethod || 'sqlite'}
                onChange={(e) =>
                  setDraft(prev => ({
                    ...(prev as any),
                    config: { ...(cfg as any), connectionMethod: e.target.value }
                  }))
                }
              >
                <option value="sqlite">SQLite</option>
                <option value="on-prem">On-Premise</option>
                <option value="api-token">API/Token</option>
              </select>
            </div>
            {cfg.connectionMethod === 'sqlite' ? (
              <div>
                <label className="block text-gray-700 mb-1">Database Name</label>
                <input
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={cfg.database || ''}
                  onChange={(e) =>
                    setDraft(prev => ({
                      ...(prev as any),
                      config: { ...(cfg as any), database: e.target.value }
                    }))
                  }
                  placeholder="mydatabase.db"
                />
              </div>
            ) : cfg.connectionMethod === 'api-token' ? (
              <>
                <div>
                  <label className="block text-gray-700 mb-1">Database Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={cfg.protocol || 'postgresql'}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), protocol: e.target.value }
                      }))
                    }
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Host</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={cfg.host || ''}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), host: e.target.value }
                      }))
                    }
                    placeholder="db.example.com"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Port</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={typeof cfg.port === 'number' && Number.isFinite(cfg.port) ? cfg.port : ''}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), port: parsePort(e.target.value) }
                      }))
                    }
                    placeholder="5432"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Database Name</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={cfg.database || ''}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), database: e.target.value }
                      }))
                    }
                    placeholder="yelp_test"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">API Key / Token</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={cfg.apiToken || ''}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), apiToken: e.target.value }
                      }))
                    }
                    placeholder="Enter API key or token"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-gray-700 mb-1">Database Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={cfg.protocol || 'postgresql'}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), protocol: e.target.value }
                      }))
                    }
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 mb-1">Host</label>
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={cfg.host || ''}
                      onChange={(e) =>
                        setDraft(prev => ({
                          ...(prev as any),
                          config: { ...(cfg as any), host: e.target.value }
                        }))
                      }
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Port</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={typeof cfg.port === 'number' && Number.isFinite(cfg.port) ? cfg.port : ''}
                      onChange={(e) =>
                        setDraft(prev => ({
                          ...(prev as any),
                          config: { ...(cfg as any), port: parsePort(e.target.value) }
                        }))
                      }
                      placeholder="5432"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Database</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={cfg.database || ''}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), database: e.target.value }
                      }))
                    }
                    placeholder="yelp_test"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Username</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={cfg.username || ''}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), username: e.target.value }
                      }))
                    }
                    placeholder="postgres"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={cfg.password || ''}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), password: e.target.value }
                      }))
                    }
                    placeholder="Enter password"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    id={`ssl-${id}`}
                    type="checkbox"
                    className="mr-2"
                    checked={Boolean(cfg.ssl)}
                    onChange={(e) =>
                      setDraft(prev => ({
                        ...(prev as any),
                        config: { ...(cfg as any), ssl: e.target.checked }
                      }))
                    }
                  />
                  <label htmlFor={`ssl-${id}`} className="text-gray-700">Enable SSL</label>
                </div>
              </>
            )}
          </>
        )}

        {(draft.type === 'proxy' || draft.type === 'vpn') && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 mb-1">Host</label>
                <input
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={cfg.host || ''}
                  onChange={(e) =>
                    setDraft(prev => ({
                      ...(prev as any),
                      config: { ...(cfg as any), host: e.target.value }
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Port</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={typeof cfg.port === 'number' && Number.isFinite(cfg.port) ? cfg.port : ''}
                  onChange={(e) =>
                    setDraft(prev => ({
                      ...(prev as any),
                      config: { ...(cfg as any), port: parsePort(e.target.value) }
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Protocol</label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 uppercase"
                value={cfg.protocol || ''}
                onChange={(e) =>
                  setDraft(prev => ({
                    ...(prev as any),
                    config: { ...(cfg as any), protocol: e.target.value }
                  }))
                }
                placeholder={draft.type === 'proxy' ? 'HTTP / SOCKS5' : 'OPENVPN / WIREGUARD'}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const actionsFor = (integration: Integration) => {
    const busyNow = !!busy[integration.id];
    const editing = isEditing(integration.id);
    console.log('Rendering actions for:', integration.id, { busyNow, editing });
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon(integration.status)}

        <button
          onClick={() => testConnection(integration.id)}
          disabled={busyNow || editing}
          title="Test connection"
          className={`p-1 rounded transition-colors ${
            busyNow || editing
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-blue-50 hover:text-blue-600 cursor-pointer'
          }`}
          aria-label="Test connection"
        >
          <RefreshCw className={`w-4 h-4 ${busyNow ? 'animate-spin' : ''}`} />
        </button>

        {!editing ? (
          <button
            onClick={() => startEdit(integration)}
            className="p-1 rounded hover:bg-black/5"
            aria-label={`Edit ${integration.name}`}
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
        ) : (
          <>
            <button
              onClick={saveEdit}
              className="p-1 rounded text-green-700 hover:bg-green-50"
              aria-label="Save"
              title="Save"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={cancelEdit}
              className="p-1 rounded text-gray-700 hover:bg-gray-50"
              aria-label="Cancel"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          onClick={() => handleDeleteIntegration(integration.id)}
          className="p-1 rounded text-red-600 hover:bg-red-50"
          aria-label={`Delete ${integration.name}`}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600 mt-1">Manage database connections, proxies, and VPN configurations</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {integrations.map((integration) => (
          <div key={integration.id} className={`border rounded-lg p-4 ${getCardColor(integration.type)}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getIcon(integration.type)}
                <h3 className="font-semibold text-gray-900">{integration.name}</h3>
              </div>
              {actionsFor(integration)}
            </div>

            {isEditing(integration.id) ? renderEditFields(integration.id) : renderViewFields(integration)}
          </div>
        ))}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Integration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newIntegration.name || ''}
                  onChange={(e) => setNewIntegration(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Integration name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newIntegration.type || 'database'}
                  onChange={(e) => setNewIntegration(prev => ({ ...prev, type: e.target.value as IntegrationType }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="database">Database</option>
                  <option value="proxy">Proxy Server</option>
                  <option value="vpn">VPN Connection</option>
                </select>
              </div>

              {newIntegration.type === 'database' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Connection Method</label>
                    <select
                      value={newIntegration.config?.connectionMethod || 'sqlite'}
                      onChange={(e) =>
                        setNewIntegration(prev => ({
                          ...prev,
                          config: { ...(prev.config || {}), connectionMethod: e.target.value }
                        }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="sqlite">SQLite</option>
                      <option value="on-prem">On-Premise</option>
                      <option value="api-token">API/Token</option>
                    </select>
                  </div>
                  {newIntegration.config?.connectionMethod === 'sqlite' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                      <input
                        type="text"
                        value={newIntegration.config?.database || ''}
                        onChange={(e) =>
                          setNewIntegration(prev => ({
                            ...prev,
                            config: { ...(prev.config || {}), database: e.target.value }
                          }))
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="mydatabase.db"
                      />
                    </div>
                  ) : newIntegration.config?.connectionMethod === 'api-token' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
                        <select
                          value={newIntegration.config?.protocol || 'postgresql'}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), protocol: e.target.value }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="postgresql">PostgreSQL</option>
                          <option value="mysql">MySQL</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                        <input
                          type="text"
                          value={newIntegration.config?.host || ''}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), host: e.target.value }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="db.example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                        <input
                          type="number"
                          value={
                            typeof newIntegration.config?.port === 'number' &&
                            Number.isFinite(newIntegration.config.port)
                              ? newIntegration.config.port
                              : ''
                          }
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), port: parsePort(e.target.value) }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="5432"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                        <input
                          type="text"
                          value={newIntegration.config?.database || ''}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), database: e.target.value }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="yelp_test"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key / Token</label>
                        <input
                          type="password"
                          value={newIntegration.config?.apiToken || ''}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), apiToken: e.target.value }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter API key or token"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
                        <select
                          value={newIntegration.config?.protocol || 'postgresql'}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), protocol: e.target.value }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="postgresql">PostgreSQL</option>
                          <option value="mysql">MySQL</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                        <input
                          type="text"
                          value={newIntegration.config?.host || ''}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), host: e.target.value }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="localhost"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                        <input
                          type="number"
                          value={
                            typeof newIntegration.config?.port === 'number' &&
                            Number.isFinite(newIntegration.config.port)
                              ? newIntegration.config.port
                              : ''
                          }
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), port: parsePort(e.target.value) }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="5432"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                        <input
                          type="text"
                          value={newIntegration.config?.database || ''}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), database: e.target.value }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="yelp_test"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                          type="text"
                          value={newIntegration.config?.username || ''}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), username: e.target.value }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="db_user"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                          type="password"
                          value={newIntegration.config?.password || ''}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), password: e.target.value }
                            }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Enter password"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          id="ssl"
                          type="checkbox"
                          checked={Boolean(newIntegration.config?.ssl)}
                          onChange={(e) =>
                            setNewIntegration(prev => ({
                              ...prev,
                              config: { ...(prev.config || {}), ssl: e.target.checked }
                            }))
                          }
                          className="mr-2"
                        />
                        <label htmlFor="ssl" className="text-sm text-gray-700">Enable SSL</label>
                      </div>
                    </>
                  )}
                </>
              )}

              {(newIntegration.type === 'proxy' || newIntegration.type === 'vpn') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                    <input
                      type="text"
                      value={newIntegration.config?.host || ''}
                      onChange={(e) =>
                        setNewIntegration(prev => ({
                          ...prev,
                          config: { ...(prev.config || {}), host: e.target.value }
                        }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                    <input
                      type="number"
                      value={
                        typeof newIntegration.config?.port === 'number' &&
                        Number.isFinite(newIntegration.config.port)
                          ? newIntegration.config.port
                          : ''
                      }
                      onChange={(e) =>
                        setNewIntegration(prev => ({
                          ...prev,
                          config: { ...(prev.config || {}), port: parsePort(e.target.value) }
                        }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="8080"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIntegration}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Integration
              </button>
            </div>
          </div>
        </div>
      )}

      {migrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Data Migration Required</h2>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                The integration <strong>{migrationModal.integrationName}</strong> is currently in use by one or more environments.
              </p>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                  <div>
                    <p className="text-sm text-yellow-700">
                      <strong>Important:</strong> Before deletion, all data from this database integration will be migrated back to defaultRecorder.db to preserve your data.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                This will:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
                <li>Export all data (integrations, test sessions, users, logs)</li>
                <li>Migrate data to defaultRecorder.db</li>
                <li>Delete the integration after successful migration</li>
              </ul>

              <p className="text-sm text-gray-700 font-medium">
                Do you want to proceed with the migration and deletion?
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setMigrationModal(null)}
                disabled={isMigrating}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMigrateAndDelete}
                disabled={isMigrating}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  'Migrate & Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white min-w-[300px] animate-slide-in ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
