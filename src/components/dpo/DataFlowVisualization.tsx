import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  Cloud, 
  Users, 
  ArrowRight, 
  Shield, 
  Globe,
  AlertTriangle,
  Info,
  Eye,
  Download
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface DataFlowNode {
  id: string;
  name: string;
  type: 'source' | 'processor' | 'recipient' | 'storage';
  location: string;
  adequacyDecision?: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  dataCategories: string[];
  position: { x: number; y: number };
}

interface DataFlowConnection {
  id: string;
  from: string;
  to: string;
  dataTypes: string[];
  lawfulBasis: string;
  safeguards?: string[];
  encrypted: boolean;
}

interface DataFlowVisualizationProps {
  activityId: string;
  tenantId?: string;
}

export const DataFlowVisualization: React.FC<DataFlowVisualizationProps> = ({ 
  activityId, 
  tenantId 
}) => {
  const [nodes, setNodes] = useState<DataFlowNode[]>([]);
  const [connections, setConnections] = useState<DataFlowConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<DataFlowNode | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<DataFlowConnection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDataFlow();
  }, [activityId, tenantId]);

  const loadDataFlow = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockNodes: DataFlowNode[] = [
        {
          id: 'source-1',
          name: 'Customer Portal',
          type: 'source',
          location: 'EU',
          riskLevel: 'low',
          dataCategories: ['Contact Info', 'Preferences'],
          position: { x: 50, y: 200 }
        },
        {
          id: 'processor-1',
          name: 'CRM System',
          type: 'processor',
          location: 'EU',
          riskLevel: 'medium',
          dataCategories: ['Contact Info', 'Preferences', 'Transaction History'],
          position: { x: 300, y: 200 }
        },
        {
          id: 'storage-1',
          name: 'Customer Database',
          type: 'storage',
          location: 'EU',
          riskLevel: 'medium',
          dataCategories: ['Contact Info', 'Preferences', 'Transaction History'],
          position: { x: 550, y: 150 }
        },
        {
          id: 'recipient-1',
          name: 'Email Service Provider',
          type: 'recipient',
          location: 'US',
          adequacyDecision: false,
          riskLevel: 'high',
          dataCategories: ['Contact Info'],
          position: { x: 550, y: 300 }
        },
        {
          id: 'recipient-2',
          name: 'Analytics Platform',
          type: 'recipient',
          location: 'EU',
          adequacyDecision: true,
          riskLevel: 'low',
          dataCategories: ['Preferences', 'Usage Data'],
          position: { x: 800, y: 200 }
        }
      ];

      const mockConnections: DataFlowConnection[] = [
        {
          id: 'conn-1',
          from: 'source-1',
          to: 'processor-1',
          dataTypes: ['Contact Info', 'Preferences'],
          lawfulBasis: 'Contract',
          encrypted: true
        },
        {
          id: 'conn-2',
          from: 'processor-1',
          to: 'storage-1',
          dataTypes: ['Contact Info', 'Preferences', 'Transaction History'],
          lawfulBasis: 'Contract',
          encrypted: true
        },
        {
          id: 'conn-3',
          from: 'processor-1',
          to: 'recipient-1',
          dataTypes: ['Contact Info'],
          lawfulBasis: 'Legitimate Interest',
          safeguards: ['Standard Contractual Clauses', 'Encryption'],
          encrypted: true
        },
        {
          id: 'conn-4',
          from: 'storage-1',
          to: 'recipient-2',
          dataTypes: ['Preferences', 'Usage Data'],
          lawfulBasis: 'Legitimate Interest',
          encrypted: true
        }
      ];

      setNodes(mockNodes);
      setConnections(mockConnections);
      setTimeout(() => setLoading(false), 1000);
    } catch (error) {
      console.error('Failed to load data flow:', error);
      setLoading(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'source': return <Users className="h-6 w-6" />;
      case 'processor': return <Server className="h-6 w-6" />;
      case 'storage': return <Database className="h-6 w-6" />;
      case 'recipient': return <Cloud className="h-6 w-6" />;
      default: return <Server className="h-6 w-6" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'border-green-500 bg-green-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'high': return 'border-red-500 bg-red-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getConnectionPath = (from: DataFlowNode, to: DataFlowNode) => {
    const startX = from.position.x + 100;
    const startY = from.position.y + 50;
    const endX = to.position.x;
    const endY = to.position.y + 50;
    
    const midX = (startX + endX) / 2;
    
    return `M ${startX} ${startY} Q ${midX} ${startY} ${midX} ${(startY + endY) / 2} Q ${midX} ${endY} ${endX} ${endY}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Data Flow Visualization</h2>
          <p className="text-gray-500">Visual representation of data processing flows</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Diagram
          </Button>
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Full Screen
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 border-2 border-blue-500 bg-blue-50 rounded flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-700">Data Source</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 border-2 border-purple-500 bg-purple-50 rounded flex items-center justify-center">
              <Server className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-sm text-gray-700">Processor</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 border-2 border-green-500 bg-green-50 rounded flex items-center justify-center">
              <Database className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm text-gray-700">Storage</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 border-2 border-orange-500 bg-orange-50 rounded flex items-center justify-center">
              <Cloud className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-sm text-gray-700">Recipient</span>
          </div>
        </div>
      </Card>

      {/* Data Flow Diagram */}
      <Card className="p-6">
        <div className="relative" style={{ height: '500px', overflow: 'auto' }}>
          <svg width="1000" height="400" className="absolute inset-0">
            {/* Connections */}
            {connections.map((connection) => {
              const fromNode = nodes.find(n => n.id === connection.from);
              const toNode = nodes.find(n => n.id === connection.to);
              if (!fromNode || !toNode) return null;

              return (
                <g key={connection.id}>
                  <path
                    d={getConnectionPath(fromNode, toNode)}
                    stroke={connection.encrypted ? '#10b981' : '#ef4444'}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={connection.encrypted ? '0' : '5,5'}
                    className="cursor-pointer hover:stroke-width-3"
                    onClick={() => setSelectedConnection(connection)}
                  />
                  <circle
                    cx={(fromNode.position.x + 100 + toNode.position.x) / 2}
                    cy={(fromNode.position.y + 50 + toNode.position.y + 50) / 2}
                    r="8"
                    fill={connection.encrypted ? '#10b981' : '#ef4444'}
                    className="cursor-pointer"
                    onClick={() => setSelectedConnection(connection)}
                  >
                    <title>{connection.dataTypes.join(', ')}</title>
                  </circle>
                  {connection.encrypted && (
                    <Shield 
                      x={(fromNode.position.x + 100 + toNode.position.x) / 2 - 6}
                      y={(fromNode.position.y + 50 + toNode.position.y + 50) / 2 - 6}
                      width="12" 
                      height="12" 
                      className="text-white pointer-events-none"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`absolute w-24 h-20 border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-lg ${getRiskColor(node.riskLevel)}`}
              style={{ 
                left: `${node.position.x}px`, 
                top: `${node.position.y}px` 
              }}
              onClick={() => setSelectedNode(node)}
            >
              <div className="flex flex-col items-center text-center">
                {getNodeIcon(node.type)}
                <span className="text-xs font-medium mt-1 leading-tight">{node.name}</span>
                <div className="flex items-center mt-1">
                  <Globe className="h-3 w-3 mr-1" />
                  <span className="text-xs">{node.location}</span>
                </div>
              </div>
              {node.riskLevel === 'high' && (
                <AlertTriangle className="absolute -top-1 -right-1 h-4 w-4 text-red-500" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Risk Assessment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Low Risk Nodes</p>
              <p className="text-2xl font-bold text-green-600">
                {nodes.filter(n => n.riskLevel === 'low').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Medium Risk Nodes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {nodes.filter(n => n.riskLevel === 'medium').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">High Risk Nodes</p>
              <p className="text-2xl font-bold text-red-600">
                {nodes.filter(n => n.riskLevel === 'high').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Node Details Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{selectedNode.name}</h3>
                <Button variant="outline" onClick={() => setSelectedNode(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Type</p>
                <p className="text-gray-900 capitalize">{selectedNode.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Location</p>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>{selectedNode.location}</span>
                  {selectedNode.adequacyDecision !== undefined && (
                    <Badge className={selectedNode.adequacyDecision ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {selectedNode.adequacyDecision ? 'Adequate' : 'Safeguards Required'}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Risk Level</p>
                <Badge className={
                  selectedNode.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                  selectedNode.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }>
                  {selectedNode.riskLevel.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Data Categories</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNode.dataCategories.map((category, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Details Modal */}
      {selectedConnection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Data Transfer Details</h3>
                <Button variant="outline" onClick={() => setSelectedConnection(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Data Types</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedConnection.dataTypes.map((type, idx) => (
                    <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Lawful Basis</p>
                <p className="text-gray-900">{selectedConnection.lawfulBasis}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Encryption</p>
                <div className="flex items-center space-x-2">
                  <Shield className={`h-4 w-4 ${selectedConnection.encrypted ? 'text-green-500' : 'text-red-500'}`} />
                  <span className={selectedConnection.encrypted ? 'text-green-700' : 'text-red-700'}>
                    {selectedConnection.encrypted ? 'Encrypted' : 'Not Encrypted'}
                  </span>
                </div>
              </div>
              {selectedConnection.safeguards && selectedConnection.safeguards.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Safeguards</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedConnection.safeguards.map((safeguard, idx) => (
                      <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {safeguard}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFlowVisualization;