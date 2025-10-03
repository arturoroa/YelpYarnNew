import React, { useEffect, useState } from 'react';
import { Database, Server, Key, Shield, Plus, Trash2, CircleCheck as CheckCircle, Circle as XCircle, Pencil, Save, X, RefreshCw, Power } from 'lucide-react';

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
    config: {}
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
      setIntegrations(data.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status,
        lastSync: item.last_sync,
        config: item.config
      })));
    } catch (error) {
      console.error('Error fetching integrations:', error);
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

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type,
          config: cfg
        })
      });

      if (!response.ok) throw new Error('Failed to create integration');

      await fetchIntegrations();
      setNewIntegration({ type: 'database', config: {} });
      setShowAddForm(false);
      showToast('Integration created successfully', 'success');
    } catch (error) {
      console.error('Error creating integration:', error);
      showToast('Failed to create integration', 'error');
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete integration');

      setIntegrations(prev => prev.filter(int => int.id !== id));
      showToast('Integration deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting integration:', error);
      showToast('Failed to delete integration', 'error');
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type,
          config: cfg
        })
      });

      if (!response.ok) throw new Error('Failed to update integration');

      const updated = await response.json();
      setIntegrations(prev =>
        prev.map(i => (i.id === editingId ? {
          id: updated.id,
          name: updated.name,
          type: updated.type,
          status: updated.status,
          lastSync: updated.last_sync,
          config: updated.config
        } : i))
      );
      cancelEdit();
      showToast('Integration updated successfully', 'success');
    } catch (error) {
      console.error('Error updating integration:', error);
      showToast('Failed to update integration', 'error');
    }
  };

  const toggleStatus = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;

    const next: IntegrationStatus =
      integration.status === 'connected' ? 'disconnected' :
      integration.status === 'disconnected' ? 'connected' : 'disconnected';

    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: next
        })
      });

      if (!response.ok) throw new Error('Failed to update status');

      setIntegrations(prev =>
        prev.map(i => (i.id === id ? { ...i, status: next } : i))
      );
      showToast(`Integration ${next === 'connected' ? 'connected' : 'disconnected'}`, 'info');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const testConnection = async (id: string) => {
    setBusyFor(id, true);
    try {
      const target = integrations.find(i => i.id === id);
      if (!target) return;

      const response = await fetch('/api/integrations/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: target.type,
          config: target.config
        })
      });

      const result = await response.json();

      const newStatus = result.success ? 'connected' : 'error';
      const lastSync = result.success ? 'just now' : undefined;

      await fetch(`/api/integrations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          last_sync: lastSync
        })
      });

      setIntegrations(prev =>
        prev.map(i =>
          i.id === id
            ? { ...i, status: newStatus, lastSync }
            : i
        )
      );

      if (result.success) {
        showToast('Connection successful', 'success');
      } else {
        showToast(`Connection failed: ${result.error}`, 'error');
      }
    } catch (error) {
      const errorStatus = 'error';

      await fetch(`/api/integrations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: errorStatus
        })
      }).catch(() => {});

      setIntegrations(prev =>
        prev.map(i =>
          i.id === id
            ? { ...i, status: errorStatus }
            : i
        )
      );
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

        {(draft.type === 'database') && (
          <>
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

        {(draft.type === 'proxy' || draft.type === 'vpn') && (
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
        )}
      </div>
    );
  };

  const actionsFor = (integration: Integration) => {
    const busyNow = !!busy[integration.id];
    const editing = isEditing(integration.id);
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon(integration.status)}

        <button
          onClick={() => toggleStatus(integration.id)}
          disabled={busyNow || editing}
          title={integration.status === 'connected' ? 'Disconnect' : 'Connect'}
          className={`p-1 rounded ${editing ? 'opacity-40 cursor-not-allowed' : 'hover:bg-black/5'}`}
          aria-label="Toggle status"
        >
          <Power className="w-4 h-4" />
        </button>

        <button
          onClick={() => testConnection(integration.id)}
          disabled={busyNow || editing}
          title="Test connection"
          className={`p-1 rounded ${editing ? 'opacity-40 cursor-not-allowed' : 'hover:bg-black/5'}`}
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

              {newIntegration.type === 'database' && (
                <>
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
