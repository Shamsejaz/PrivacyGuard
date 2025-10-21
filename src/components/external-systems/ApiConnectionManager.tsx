import React, { useState, useEffect } from 'react';
import { Globe, Plus, Edit, Trash2, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { externalSystemService, type ApiConnection } from '../../services/externalSystemService';

export const ApiConnectionManager: React.FC = () => {
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await externalSystemService.getApiConnections();
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API connections');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    try {
      await externalSystemService.testApiConnection(connectionId);
      // Refresh connections to get updated status
      loadConnections();
    } catch (err) {
      console.error('Failed to test connection:', err);
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">API Connections</h2>
          <p className="text-gray-600">Manage connections to external APIs</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add API Connection
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {connections.length === 0 ? (
            <li className="px-6 py-8 text-center">
              <Globe className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No API connections</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new API connection.</p>
            </li>
          ) : (
            connections.map((connection) => (
              <li key={connection.id}>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Globe className="h-8 w-8 text-gray-400" />
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{connection.name}</h3>
                        <p className="text-sm text-gray-500">{connection.baseUrl}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        {connection.status === 'active' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="ml-2 text-sm text-gray-600">
                          {connection.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleTestConnection(connection.id)}
                          className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <TestTube className="h-4 w-4" />
                        </button>
                        <button className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50">
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
    </div>
  );
};