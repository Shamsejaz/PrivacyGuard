import React from 'react';
import { Database, Cloud, FileText, Users, ArrowRight, Shield, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface DataFlowNode {
  id: string;
  name: string;
  type: 'source' | 'processing' | 'storage' | 'destination';
  category: 'database' | 'cloud_storage' | 'file_system' | 'saas' | 'processing' | 'analytics';
  piiLevel: 'none' | 'low' | 'medium' | 'high';
  position: { x: number; y: number };
}

interface DataFlowConnection {
  from: string;
  to: string;
  dataTypes: string[];
  encrypted: boolean;
}

const DataFlowDiagram: React.FC = () => {
  const nodes: DataFlowNode[] = [
    { id: '1', name: 'Customer DB', type: 'source', category: 'database', piiLevel: 'high', position: { x: 50, y: 100 } },
    { id: '2', name: 'AWS S3', type: 'storage', category: 'cloud_storage', piiLevel: 'medium', position: { x: 300, y: 50 } },
    { id: '3', name: 'Salesforce', type: 'source', category: 'saas', piiLevel: 'high', position: { x: 50, y: 200 } },
    { id: '4', name: 'Analytics Engine', type: 'processing', category: 'processing', piiLevel: 'low', position: { x: 300, y: 150 } },
    { id: '5', name: 'Data Warehouse', type: 'destination', category: 'database', piiLevel: 'medium', position: { x: 550, y: 100 } },
    { id: '6', name: 'SharePoint', type: 'source', category: 'file_system', piiLevel: 'medium', position: { x: 50, y: 300 } },
  ];

  const connections: DataFlowConnection[] = [
    { from: '1', to: '2', dataTypes: ['PII', 'Contact Info'], encrypted: true },
    { from: '1', to: '4', dataTypes: ['Anonymized Data'], encrypted: true },
    { from: '3', to: '4', dataTypes: ['Customer Data'], encrypted: true },
    { from: '4', to: '5', dataTypes: ['Aggregated Data'], encrypted: true },
    { from: '2', to: '5', dataTypes: ['Backup Data'], encrypted: true },
    { from: '6', to: '2', dataTypes: ['Documents', 'PII'], encrypted: false },
  ];

  const getNodeIcon = (category: string) => {
    switch (category) {
      case 'database': return <Database className="h-5 w-5" />;
      case 'cloud_storage': return <Cloud className="h-5 w-5" />;
      case 'file_system': return <FileText className="h-5 w-5" />;
      case 'saas': return <Users className="h-5 w-5" />;
      case 'processing': return <Shield className="h-5 w-5" />;
      default: return <Database className="h-5 w-5" />;
    }
  };

  const getPiiLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getConnectionColor = (encrypted: boolean) => {
    return encrypted ? 'stroke-green-500' : 'stroke-red-500';
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Data Flow Mapping</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span className="text-sm text-gray-600">Encrypted</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span className="text-sm text-gray-600">Unencrypted</span>
          </div>
        </div>
      </div>

      <div className="relative bg-gray-50 rounded-lg p-6 min-h-96">
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
          {connections.map((connection, index) => {
            const fromNode = nodes.find(n => n.id === connection.from);
            const toNode = nodes.find(n => n.id === connection.to);
            if (!fromNode || !toNode) return null;

            return (
              <g key={index}>
                <line
                  x1={fromNode.position.x + 60}
                  y1={fromNode.position.y + 30}
                  x2={toNode.position.x}
                  y2={toNode.position.y + 30}
                  className={getConnectionColor(connection.encrypted)}
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                {!connection.encrypted && (
                  <AlertTriangle 
                    className="h-4 w-4 text-red-500" 
                    x={(fromNode.position.x + toNode.position.x) / 2} 
                    y={(fromNode.position.y + toNode.position.y) / 2}
                  />
                )}
              </g>
            );
          })}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>
          </defs>
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className={`absolute border-2 rounded-lg p-3 bg-white shadow-sm ${getPiiLevelColor(node.piiLevel)}`}
            style={{ 
              left: node.position.x, 
              top: node.position.y,
              zIndex: 2,
              minWidth: '120px'
            }}
          >
            <div className="flex items-center space-x-2 mb-2">
              {getNodeIcon(node.category)}
              <span className="font-medium text-sm">{node.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <Badge 
                variant={node.piiLevel === 'high' ? 'danger' : node.piiLevel === 'medium' ? 'warning' : 'success'}
                size="sm"
              >
                {node.piiLevel.toUpperCase()} PII
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">High Risk Flows</span>
          </div>
          <p className="text-sm text-red-700">2 unencrypted data transfers detected</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Medium Risk</span>
          </div>
          <p className="text-sm text-yellow-700">4 flows with medium PII exposure</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Compliant Flows</span>
          </div>
          <p className="text-sm text-green-700">8 encrypted, compliant data flows</p>
        </div>
      </div>
    </Card>
  );
};

export default DataFlowDiagram;