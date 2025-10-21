import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Copy, Download, Upload, AlertCircle } from 'lucide-react';
import { externalSystemService, type ExternalSystemConfig, type ConfigTemplate } from '../../services/externalSystemService';

export const ConfigurationManager: React.FC = () => {
  const [configs, setConfigs] = useState<ExternalSystemConfig[]>([]);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsData, templatesData] = await Promise.all([
        externalSystemService.getConfigs(),
        externalSystemService.getConfigTemplates()
      ]);
      setConfigs(configsData);
      setTemplates(templatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      await externalSystemService.deleteConfig(configId);
      setConfigs(prev => prev.filter(config => config.id !== configId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  const filteredConfigs = configs.filter(config => {
    const typeMatch = selectedType === 'all' || config.type === selectedType;
    const categoryMatch = selectedCategory === 'all' || config.category === selectedCategory;
    return typeMatch && categoryMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'database':
        return 'bg-blue-100 text-blue-800';
      case 'api':
        return 'bg-green-100 text-green-800';
      case 'file_system':
        return 'bg-purple-100 text-purple-800';
      case 'cloud_storage':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h2 className="text-xl font-semibold text-gray-900">Configuration Management</h2>
          <p className="text-gray-600">Manage external system configurations and templates</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Configuration
          </button>
        </div>
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="database">Database</option>
              <option value="api">API</option>
              <option value="file_system">File System</option>
              <option value="cloud_storage">Cloud Storage</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Categories</option>
              <option value="source">Source</option>
              <option value="target">Target</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>
      </div>

      {/* Configuration Templates */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Configuration Templates</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(template.type)}`}>
                    {template.type}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">{template.description}</p>
                <button className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Configurations List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Configurations ({filteredConfigs.length})
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {filteredConfigs.length === 0 ? (
            <li className="px-6 py-8 text-center">
              <Settings className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No configurations</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedType !== 'all' || selectedCategory !== 'all' 
                  ? 'No configurations match the selected filters.'
                  : 'Get started by creating a new configuration.'
                }
              </p>
            </li>
          ) : (
            filteredConfigs.map((config) => (
              <li key={config.id}>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Settings className="h-8 w-8 text-gray-400" />
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(config.type)}`}>
                            {config.type}
                          </span>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            config.category === 'source' ? 'bg-blue-100 text-blue-800' :
                            config.category === 'target' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {config.category}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>Environment: {config.metadata.environment}</span>
                          {config.metadata.owner && (
                            <span className="ml-4">Owner: {config.metadata.owner}</span>
                          )}
                          <span className="ml-4">
                            Created: {new Date(config.metadata.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {config.metadata.description && (
                          <div className="mt-1 text-sm text-gray-600">
                            {config.metadata.description}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(config.status)}`}>
                        {config.status}
                      </span>

                      <div className="flex items-center space-x-2">
                        <button className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                          <Copy className="h-4 w-4" />
                        </button>
                        <button className="inline-flex items-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(config.id)}
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
    </div>
  );
};