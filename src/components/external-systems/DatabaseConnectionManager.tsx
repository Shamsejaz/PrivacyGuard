import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import { externalSystemService, type DatabaseConnection, type DatabaseConfig } from '../../services/externalSystemService';

export const DatabaseConnectionManager: React.FC = () => {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await externalSystemService.getDatabaseConnections();
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    try {
      setTestingConnections(prev => new Set(prev).add(connectionId));
      const result = await externalSystemService.testDatabaseConnection(connectionId);
      
      // Update connection status in local state
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: result.healthy ? 'connected' : 'error' }
          : conn
      ));
    } catch (err) {
      console.error('Failed to test connection:', err);
    } finally {
      setTestingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    try {
      await externalSystemService.removeDatabaseConnection(connectionId);
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete connection');
    }
  };

  const getStatusIcon = (status: DatabaseConnection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'connecting':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: DatabaseConnection['status']) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'connecting':
        return 'Connecting';
      default:
        return 'Disconnected';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Database Connections</h2>
          <p className="text-gray-600">Manage connections to external databases</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connections List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {connections.length === 0 ? (
            <li className="px-6 py-8 text-center">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No database connections</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new database connection.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Connection
                </button>
              </div>
            </li>
          ) : (
            connections.map((connection) => (
              <li key={connection.id}>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Database className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{connection.name}</h3>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            connection.type === 'postgresql' ? 'bg-blue-100 text-blue-800' :
                            connection.type === 'mongodb' ? 'bg-green-100 text-green-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {connection.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>{connection.config.host}:{connection.config.port}/{connection.config.database}</span>
                          {connection.lastConnected && (
                            <span className="ml-4">
                              Last connected: {new Date(connection.lastConnected).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {connection.lastError && (
                          <div className="mt-1 text-sm text-red-600">
                            Error: {connection.lastError}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* Status */}
                      <div className="flex items-center">
                        {getStatusIcon(connection.status)}
                        <span className="ml-2 text-sm text-gray-600">
                          {getStatusText(connection.status)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleTestConnection(connection.id)}
                          disabled={testingConnections.has(connection.id)}
                          className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          {testingConnections.has(connection.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => setEditingConnection(connection)}
                          className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteConnection(connection.id)}
                          className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingConnection) && (
        <DatabaseConnectionModal
          connection={editingConnection}
          onClose={() => {
            setShowCreateModal(false);
            setEditingConnection(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingConnection(null);
            loadConnections();
          }}
        />
      )}
    </div>
  );
};

interface DatabaseConnectionModalProps {
  connection?: DatabaseConnection | null;
  onClose: () => void;
  onSave: () => void;
}

const DatabaseConnectionModal: React.FC<DatabaseConnectionModalProps> = ({
  connection,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: connection?.name || '',
    type: connection?.type || 'postgresql' as const,
    config: {
      host: connection?.config.host || '',
      port: connection?.config.port || 5432,
      database: connection?.config.database || '',
      username: connection?.config.username || '',
      password: connection?.config.password || '',
      ssl: connection?.config.ssl || false,
      connectionTimeout: connection?.config.connectionTimeout || 5000,
      maxConnections: connection?.config.maxConnections || 10,
      // MongoDB specific
      authSource: connection?.config.authSource || '',
      replicaSet: connection?.config.replicaSet || '',
      // MySQL specific
      charset: connection?.config.charset || 'utf8mb4',
      timezone: connection?.config.timezone || 'Z'
    }
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      const connectionData = {
        id: connection?.id || `conn_${Date.now()}`,
        ...formData
      };

      if (connection) {
        // Update existing connection - would need an update endpoint
        console.log('Update not implemented yet');
      } else {
        await externalSystemService.createDatabaseConnection(connectionData);
      }
      
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {connection ? 'Edit Database Connection' : 'Create Database Connection'}
          </h3>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Database Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mongodb">MongoDB</option>
                  <option value="mysql">MySQL</option>
                </select>
              </div>
            </div>

            {/* Connection Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Host</label>
                <input
                  type="text"
                  value={formData.config.host}
                  onChange={(e) => updateConfig('host', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Port</label>
                <input
                  type="number"
                  value={formData.config.port}
                  onChange={(e) => updateConfig('port', parseInt(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Database Name</label>
              <input
                type="text"
                value={formData.config.database}
                onChange={(e) => updateConfig('database', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={formData.config.username}
                  onChange={(e) => updateConfig('username', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.config.password}
                    onChange={(e) => updateConfig('password', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Connection Timeout (ms)</label>
                <input
                  type="number"
                  value={formData.config.connectionTimeout}
                  onChange={(e) => updateConfig('connectionTimeout', parseInt(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Connections</label>
                <input
                  type="number"
                  value={formData.config.maxConnections}
                  onChange={(e) => updateConfig('maxConnections', parseInt(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.config.ssl}
                onChange={(e) => updateConfig('ssl', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">Enable SSL</label>
            </div>

            {/* Database-specific fields */}
            {formData.type === 'mongodb' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Auth Source</label>
                  <input
                    type="text"
                    value={formData.config.authSource}
                    onChange={(e) => updateConfig('authSource', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Replica Set</label>
                  <input
                    type="text"
                    value={formData.config.replicaSet}
                    onChange={(e) => updateConfig('replicaSet', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {formData.type === 'mysql' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Charset</label>
                  <input
                    type="text"
                    value={formData.config.charset}
                    onChange={(e) => updateConfig('charset', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timezone</label>
                  <input
                    type="text"
                    value={formData.config.timezone}
                    onChange={(e) => updateConfig('timezone', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (connection ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};