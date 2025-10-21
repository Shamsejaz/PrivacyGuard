import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  email?: string; // for PayPal
  bankName?: string; // for bank transfers
}

interface Invoice {
  id: string;
  number: string;
  date: Date;
  dueDate: Date;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
  description: string;
  downloadUrl?: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export const BillingDashboard: React.FC = () => {
  const { currentTenant } = useTenant();
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Mock payment methods
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'pm-1',
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true
    },
    {
      id: 'pm-2',
      type: 'card',
      last4: '0005',
      brand: 'Mastercard',
      expiryMonth: 8,
      expiryYear: 2024,
      isDefault: false
    }
  ];

  // Mock invoices
  const invoices: Invoice[] = [
    {
      id: 'inv-001',
      number: 'INV-2024-001',
      date: new Date('2024-01-01'),
      dueDate: new Date('2024-01-15'),
      amount: 299,
      currency: 'USD',
      status: 'paid',
      description: 'Professional Plan - January 2024',
      items: [
        {
          description: 'Professional Plan Subscription',
          quantity: 1,
          unitPrice: 299,
          total: 299
        }
      ]
    },
    {
      id: 'inv-002',
      number: 'INV-2024-002',
      date: new Date('2024-02-01'),
      dueDate: new Date('2024-02-15'),
      amount: 299,
      currency: 'USD',
      status: 'pending',
      description: 'Professional Plan - February 2024',
      items: [
        {
          description: 'Professional Plan Subscription',
          quantity: 1,
          unitPrice: 299,
          total: 299
        }
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge variant="success">Paid</Badge>;
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      case 'overdue': return <Badge variant="danger">Overdue</Badge>;
      case 'failed': return <Badge variant="danger">Failed</Badge>;
      default: return <Badge variant="default">Unknown</Badge>;
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card': return <CreditCard className="w-5 h-5" />;
      case 'bank': return <DollarSign className="w-5 h-5" />;
      case 'paypal': return <DollarSign className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, invoice) => sum + invoice.amount, 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((sum, invoice) => sum + invoice.amount, 0);

  if (!currentTenant) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          No tenant selected. Please select a tenant to view billing information.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
          <p className="text-gray-600">Manage billing information for {currentTenant.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button onClick={() => setShowAddPaymentMethod(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      </div>

      {/* Billing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Billed</p>
              <p className="text-2xl font-bold text-gray-900">${totalAmount}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">${paidAmount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">${pendingAmount}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Next Payment</p>
              <p className="text-2xl font-bold text-blue-600">
                {new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).getDate()}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' })}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
            <p className="text-gray-600">Manage your payment methods</p>
          </div>
          <Button variant="outline" onClick={() => setShowAddPaymentMethod(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Method
          </Button>
        </div>

        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                {getPaymentMethodIcon(method.type)}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {method.type === 'card' && `${method.brand} •••• ${method.last4}`}
                      {method.type === 'paypal' && `PayPal ${method.email}`}
                      {method.type === 'bank' && `${method.bankName} Bank Transfer`}
                    </span>
                    {method.isDefault && (
                      <Badge variant="info" size="sm">Default</Badge>
                    )}
                  </div>
                  {method.type === 'card' && (
                    <p className="text-sm text-gray-500">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                {!method.isDefault && (
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
            <p className="text-gray-600">Your billing history and invoices</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{invoice.number}</div>
                      <div className="text-sm text-gray-500">{invoice.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${invoice.amount} {invoice.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(invoice.status)}
                      {getStatusBadge(invoice.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Payment Method Modal */}
      {showAddPaymentMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Payment Method</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Type
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="card">Credit/Debit Card</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="setDefault"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="setDefault" className="text-sm text-gray-700">
                  Set as default payment method
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddPaymentMethod(false)}
              >
                Cancel
              </Button>
              <Button>
                Add Payment Method
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Invoice Details</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-medium">{selectedInvoice.number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{selectedInvoice.date.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-medium">{selectedInvoice.dueDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedInvoice.status)}
                    {getStatusBadge(selectedInvoice.status)}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Description
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Price
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">${item.unitPrice}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">${item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-lg font-semibold">Total: ${selectedInvoice.amount} {selectedInvoice.currency}</span>
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};